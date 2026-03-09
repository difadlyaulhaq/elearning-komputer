'use client';

import React from 'react';
import DownloadAppButton from '@/components/shared/DownloadAppButton';
import { Smartphone, Info } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="flex flex-col h-screen items-center justify-center p-4 bg-gray-100">
        <div className="bg-white p-6 rounded-xl shadow-lg text-center max-w-sm w-full">
            <img 
                src="/logo-alfajr.png" 
                alt="Alfajr Umroh Logo" 
                className="w-32 h-auto object-contain mx-auto mb-4"
            />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Download Aplikasi</h1>
            
            {/* Info Box - Muncul di semua device */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6 flex items-start gap-3 text-left">
              <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p className="text-blue-800 text-[11px] leading-relaxed">
                Aplikasi ini saat ini <strong>hanya tersedia untuk perangkat Android</strong>. Pengguna iOS (iPhone/iPad) dapat mengakses melalui browser desktop.
              </p>
            </div>

            <p className="text-gray-600 mb-6 text-sm">
                Silakan unduh file APK di bawah ini untuk menginstal di HP Android Anda.
            </p>

            <div className="space-y-4">
              <DownloadAppButton 
                  variant="primary" 
                  className="w-full py-3.5" 
                  // GANTI URL DI BAWAH INI DENGAN URL DARI FIREBASE STORAGE ANDA
                  apkUrl="https://firebasestorage.googleapis.com/v0/b/alfajr-elearning.firebasestorage.app/o/alfajr-elearning.apk?alt=media"
              />
              
              <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                <Smartphone size={12} />
                <span>Android Version 1.0.0</span>
              </div>
            </div>
        </div>
        
        {/* Footer info */}
        <p className="mt-8 text-gray-400 text-[10px] uppercase tracking-widest">
          © 2026 Alfajr E-Learning • Internal App
        </p>
    </div>
  );
}
