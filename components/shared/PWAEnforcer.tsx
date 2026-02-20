'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { isMobileDevice } from '@/lib/security/mobileProtection';
import { Capacitor } from '@capacitor/core';
import DownloadAppButton from './DownloadAppButton';
import Image from 'next/image';

export default function PWAEnforcer({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Gunakan hooks Next.js untuk deteksi URL yang lebih reaktif
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
    // Cek apakah device adalah mobile browser
    setIsMobile(isMobileDevice());
    // Cek apakah berjalan di dalam Native App (Android/iOS wrapper)
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  // Hindari hydration mismatch
  if (!mounted) return <>{children}</>;

  // --- LOGIC AREA ---

  // 1. Developer Backdoor (?dev=true)
  const isDevMode = searchParams.get('dev') === 'true';

  // 2. Halaman yang Dikecualikan (Login & Auth Callback)
  // Penting agar "Login with Google" bisa redirect kembali ke sini sebelum deep link ke aplikasi.
  const isExcludedPage = 
    pathname === '/login' || 
    pathname.startsWith('/auth') || 
    searchParams.has('return_to');

  // 3. Keputusan Akhir: Blokir jika Mobile Browser + Bukan Native App + Bukan Halaman Pengecualian
  const shouldBlockAccess = isMobile && !isNative && !isExcludedPage && !isDevMode;

  // Jika tidak diblokir, render konten aplikasi
  if (!shouldBlockAccess) {
    return <>{children}</>;
  }

  // --- UI AREA (Blocked View) ---
  return (
    <div className="fixed inset-0 bg-gray-50 z-[99999] flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center text-center border border-gray-100">
        
        {/* Logo */}
        <div className="relative w-40 h-14 mb-8">
          <Image 
            src="/logo-alfajr.png" 
            alt="Alfajr E-Learning" 
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Visual Illustration (Icon) */}
        <div className="mb-6 p-4 bg-orange-50 rounded-full">
           <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-[#C5A059]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
             <line x1="12" y1="18" x2="12.01" y2="18"></line>
           </svg>
        </div>

        {/* Heading */}
        <h1 className="text-xl font-bold text-gray-900 mb-3">
          Gunakan Aplikasi Resmi
        </h1>
        
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          Untuk keamanan data dan pengalaman belajar yang optimal, silakan akses melalui aplikasi Android kami.
        </p>

        {/* Action Button */}
        <div className="w-full space-y-6">
           <DownloadAppButton 
             variant="primary" 
             className="w-full py-3.5 text-sm font-bold bg-[#C5A059] hover:bg-[#b08d4b] text-white rounded-xl shadow-lg shadow-[#C5A059]/20 transition-all active:scale-95" 
             text="Download Aplikasi Android"
             apkUrl="/Alfajr-elearning.apk"
           /> 

           {/* Divider */}
           <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-300 text-xs uppercase">Catatan</span>
              <div className="flex-grow border-t border-gray-200"></div>
           </div>

           {/* iOS Disclaimer Box */}
           <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left">
              <div className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"></path>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-gray-700">Pengguna iOS / iPhone</p>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Mohon maaf, saat ini aplikasi belum tersedia di App Store karena kebijakan platform Apple. Silakan gunakan perangkat Android atau Laptop/PC.
                  </p>
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* Footer Text */}
      <p className="mt-8 text-[10px] text-gray-400">
        &copy; {new Date().getFullYear()} Alfajr E-Learning Security
      </p>
    </div>
  );
}