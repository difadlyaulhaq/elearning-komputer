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
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let appListenerHandle: any;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setIsSyncing(true);
          // 1. Dapatkan Token Terbaru dari Firebase
          const token = await firebaseUser.getIdToken(true);
          
          // 2. Sinkronisasi ke Server (Session API)
          const loginRes = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          
          if (loginRes.ok) {
            const loginData = await loginRes.json();
            if (loginData.success) {
              setUser(loginData.user);
            }
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