'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { logoutUser } from '@/lib/firebase/auth';
import { onAuthStateChanged, signOut, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';

// --- Tipe Data ---
interface User {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  division: string;
  status: 'active' | 'inactive';
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

// --- Buat Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Buat Provider ---
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let appListenerHandle: any;

    // Listen for Deep Links (AppUrlOpen)
    // Format: alfajrelearning://auth/callback?token=XYZ
    const setupDeepLinks = async () => {
      appListenerHandle = await App.addListener('appUrlOpen', async (data) => {
        console.log('App opened with URL:', data.url);
        
        if (data.url.includes('alfajrelearning://auth/callback')) {
          const url = new URL(data.url);
          const token = url.searchParams.get('token');
          
          if (token) {
            setIsLoading(true);
            try {
              // Option 1: SignIn with Custom Token (if backend generates custom token)
              // But here we likely got an ID Token from Google provider.
              // ID Tokens cannot be used with signInWithCustomToken directly.
              // Instead, we just need to set the session on our backend
              
              const loginRes = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
              });
              
              const loginData = await loginRes.json();
              if (loginRes.ok && loginData.success) {
                setUser(loginData.user);
                // Also trigger firebase sign-in if possible, but might be tricky with just ID token
                // If we don't sign in to firebase SDK, onAuthStateChanged might fail later?
                // Actually, our app relies on the Session API for 'user' state, so this might be enough.
                router.replace('/learning/dashboard');
              }
            } catch (e) {
              console.error("Deep link auth error", e);
            } finally {
              setIsLoading(false);
            }
          }
        }
      });
    };

    setupDeepLinks();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // 1. Dapatkan Token Terbaru dari Firebase
          const token = await firebaseUser.getIdToken(true); // Force refresh token
          
          // 2. Sinkronisasi ke Server (Session API)
          // Ini sangat krusial untuk Mobile (Capacitor) agar cookie di server ter-update
          const loginRes = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            if (loginData.success) {
              setUser(loginData.user);
            } else {
              // Gagal sinkron di server meskipun Firebase login
              console.warn('Server session sync failed:', loginData.error);
              // Tetap set user dari Firebase sebagai fallback jika data user tersedia
              // Tapi idealnya kita ingin data user dari DB (via session API)
            }
          } else {
            console.error('Failed to sync session with server');
          }
        } else {
          // Tidak ada user di Firebase, cek apakah masih ada session server (opsional)
          // Jika tidak ada di Firebase, biasanya kita anggap logout total
          setUser(null);
          
          // Opsional: Panggil API logout untuk hapus cookie
          fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (appListenerHandle) {
        appListenerHandle.remove();
      }
    };
  }, []);

  const logout = async () => {
    await logoutUser();
    setUser(null);
    window.location.href = '/login';
  };
  
  const isAuthenticated = !isLoading && user !== null;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
// --- Buat Hook ---
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};