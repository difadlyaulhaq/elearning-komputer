'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Detect Android/Desktop install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (isStandalone) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt && !isIOS) return null;
  // Don't show if already installed (double check)
  if (typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white text-black p-4 rounded-lg shadow-2xl z-[100] border border-gray-200">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="font-bold text-lg">Install Aplikasi Elearning Internasional Komputer</h3>
          <p className="text-sm text-gray-600">
            {isIOS 
              ? "Untuk pengalaman terbaik, tambahkan ke Home Screen." 
              : "Install aplikasi untuk akses offline dan keamanan lebih baik."}
          </p>
        </div>
        
        {isIOS ? (
          <div className="text-sm bg-gray-100 p-2 rounded">
            1. Tap tombol Share <span className="inline-block px-1">⎋</span><br/>
            2. Pilih <strong>"Add to Home Screen"</strong> ➕
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium active:scale-95 transition-transform"
            >
              Install Sekarang
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="px-4 py-2 text-gray-500 font-medium"
            >
              Nanti
            </button>
          </div>
        )}
        
        {isIOS && (
          <button
            onClick={() => setShowPrompt(false)} // Logic to dismiss for session
            className="w-full text-center text-gray-400 text-xs mt-2"
          >
            Tutup
          </button>
        )}
      </div>
    </div>
  );
}
