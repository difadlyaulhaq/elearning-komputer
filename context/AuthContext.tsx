'use client';

import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import { logoutUser } from '@/lib/firebase/auth';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  /**
   * Pengganti fetch() yang otomatis menyertakan Authorization header.
   * Gunakan ini di semua komponen untuk fetch ke API internal agar
   * berfungsi di web (cookie) maupun Capacitor native (header).
   */
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simpan token di memori agar bisa diakses oleh authFetch tanpa state race
let _cachedToken: string | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  // Helper: ambil token fresh dari Firebase (refresh jika expired)
  const getFreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return _cachedToken;
      const token = await firebaseUser.getIdToken(false); // false = pakai cache jika masih valid
      _cachedToken = token;
      return token;
    } catch {
      return _cachedToken;
    }
  }, []);

  /**
   * authFetch: selalu tambahkan Authorization header dengan token Firebase.
   * Cookie tetap dikirim (credentials: 'include'), sehingga web browser
   * dan Capacitor WebView keduanya berfungsi.
   */
  const authFetch = useCallback(
    async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const token = await getFreshToken();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init?.headers as Record<string, string>),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      return fetch(input, {
        credentials: 'include', // tetap kirim cookie untuk web
        ...init,
        headers,
      });
    },
    [getFreshToken]
  );

  // Sync session ke server dan simpan user data
  const syncSession = useCallback(
    async (token: string): Promise<User | null> => {
      try {
        const res = await fetch('/api/auth/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ token }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        if (!data.success) return null;

        return {
          ...data.user,
          id: data.user.uid || data.user.id,
        } as User;
      } catch {
        return null;
      }
    },
    []
  );

  useEffect(() => {
    let appListenerHandle: any;

    const setupDeepLinks = async () => {
      appListenerHandle = await App.addListener('appUrlOpen', async (data) => {
        if (data.url.includes('internasionalkomputerelearning://auth/callback') || data.url.includes('alfajrelearning://auth/callback')) {
          const url = new URL(data.url);
          const token = url.searchParams.get('token');
          if (token) {
            setIsLoading(true);
            _cachedToken = token;
            const userData = await syncSession(token);
            if (userData) {
              setUser(userData);
              router.replace('/learning/dashboard');
            }
            setIsLoading(false);
          }
        }
      });
    };

    setupDeepLinks();

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setIsSyncing(true);
          const token = await firebaseUser.getIdToken(false);
          _cachedToken = token;

          const userData = await syncSession(token);
          if (userData) {
            setUser(userData);
          } else {
            console.error('Failed to sync session');
          }
          setIsSyncing(false);
        } else {
          // FALLBACK UNTUK NATIVE/MOBILE: Cek Sesi Server jika Firebase Auth kosong
          try {
            const checkRes = await fetch('/api/auth/session');
            if (checkRes.ok) {
              const checkData = await checkRes.json();
              if (checkData.isAuthenticated) {
                const userData = {
                  ...checkData.user,
                  id: checkData.user.uid || checkData.user.id
                } as User;
                setUser(userData);
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
             console.error("Check session error", e);
          }

          _cachedToken = null;
          setUser(null);
          fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        setIsSyncing(false);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (appListenerHandle) appListenerHandle.remove();
    };
  }, [syncSession, router]);

  const logout = async () => {
    _cachedToken = null;
    await logoutUser();
    setUser(null);
    window.location.href = '/login';
  };

  const isAuthenticated = !isLoading && !isSyncing && user !== null;
  const actualLoading = isLoading || isSyncing;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading: actualLoading,
        logout,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
