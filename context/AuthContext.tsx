'use client';

import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { logoutUser } from '@/lib/firebase/auth';
import { onAuthStateChanged, signOut, signInWithCustomToken } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';

import { User } from '@/types';

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
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let appListenerHandle: any;

    const setupDeepLinks = async () => {
      appListenerHandle = await App.addListener('appUrlOpen', async (data) => {
        console.log('App opened with URL:', data.url);
        
        if (data.url.includes('alfajrelearning://auth/callback')) {
          const url = new URL(data.url);
          const token = url.searchParams.get('token');
          
          if (token) {
            setIsLoading(true);
            try {
              const loginRes = await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
              });
              
              const loginData = await loginRes.json();
              if (loginRes.ok && loginData.success) {
                const userData = {
                  ...loginData.user,
                  id: loginData.user.uid || loginData.user.id
                } as User;
                setUser(userData);
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
          setIsSyncing(true);
          const token = await firebaseUser.getIdToken(true);
          
          // Sinkronisasi Sesi ke Server
          const loginRes = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            if (loginData.success) {
              // Pastikan data user memiliki field 'id' (mapping dari uid)
              const userData = {
                ...loginData.user,
                id: loginData.user.uid || loginData.user.id
              } as User;
              setUser(userData);
              console.log('User synced successfully:', userData.email);
            }
          } else {
            console.error('Failed to sync session, status:', loginRes.status);
          }
          setIsSyncing(false);
        } else {
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
  
  const isAuthenticated = !isLoading && !isSyncing && user !== null;
  const actualLoading = isLoading || isSyncing;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading: actualLoading, logout }}>
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