'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader, BookOpen } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // Jika sudah login, redirect ke dashboard
        // Cek role jika perlu, tapi default ke learning dashboard
        if (user.role === 'admin') {
           router.replace('/admin/dashboard');
        } else {
           router.replace('/learning/dashboard');
        }
      } else {
        // Jika belum login, redirect ke login page
        router.replace('/login');
      }
    }
  }, [user, isLoading, isAuthenticated, router]);

  // Tampilkan loading screen branding sementara cek auth
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
       <div className="relative mb-6">
          <div className="absolute inset-0 bg-sky-200/50 blur-xl rounded-full"></div>
          <div className="relative z-10 w-24 h-24 bg-white border border-slate-100 rounded-3xl flex items-center justify-center shadow-md">
            <BookOpen className="text-sky-600" size={40} />
          </div>
       </div>
       <div className="flex items-center gap-3 text-sky-600">
          <Loader className="animate-spin" size={24} />
          <span className="font-medium">Memuat Aplikasi...</span>
       </div>
    </div>
  );
}