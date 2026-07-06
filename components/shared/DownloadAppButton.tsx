'use client';

import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

interface DownloadAppButtonProps {
  className?: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'white-outline';
  text?: string;
  apkUrl?: string; // New prop for direct APK download
}

export default function DownloadAppButton({
  className = '',
  variant = 'primary',
  text = 'Download App',
  apkUrl
}: DownloadAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if running in standalone (PWA)
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isRunningStandalone);

    if (isRunningStandalone) return;

    // iOS detection
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Android/Desktop install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    // Priority 1: Direct APK Download (Android)
    if (apkUrl && !isIOS) {
      // Gunakan URL yang diberikan
      window.location.href = apkUrl;
      return;
    }

    // Priority 2: iOS Instructions
    if (isIOS) {
      setShowIOSInstructions(true);
    }
    // Priority 3: PWA Install Prompt
    else if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
        // Fallback
        alert('Untuk menginstall:\n1. Buka menu browser (titik tiga/opsi)\n2. Pilih "Install App" atau "Tambahkan ke Layar Utama"');
    }
  };

  // On mobile, we almost always want to show this button if not standalone
  // EXCEPT if an apkUrl is provided (we want to allow downloading APK even from PWA)
  if (!mounted || (isStandalone && !apkUrl)) return null;

  const showButton = isIOS || deferredPrompt || isIOS || apkUrl; // Show if apkUrl exists

  // If not iOS and no prompt, we can still show it if it's a mobile device (likely Android)
  // to give them the manual instructions.
  const isProbablyMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  if (!showButton && !isProbablyMobile) return null;
  const baseStyles = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all active:scale-95 touch-button";
  const variants = {
    primary: "bg-[#0284c7] text-white hover:bg-[#0369a1] shadow-md",
    outline: "border-2 border-[#0284c7] text-[#0284c7] hover:bg-[#0284c7] hover:text-white",
    ghost: "text-[#0284c7] hover:bg-[#0284c7]/10",
    "white-outline": "border border-white/30 text-white hover:bg-white hover:text-white backdrop-blur-sm bg-white/5"
  };

  return (
    <>
      <button 
        onClick={handleInstallClick}
        className={`${baseStyles} ${variants[variant]} ${className}`}
        type="button"
      >
        <Download size={18} />
        <span>{text}</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white text-black p-6 rounded-2xl max-w-sm w-full relative shadow-2xl">
            <button 
              onClick={() => setShowIOSInstructions(false)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
            
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">Install di iOS</h3>
              <p className="text-sm text-gray-600">Ikuti langkah mudah ini untuk menambahkan ke Home Screen:</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 text-left p-3 bg-gray-50 rounded-xl">
                <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                  <Share size={24} className="text-blue-500" />
                </div>
                <div className="text-sm">
                  1. Tap tombol <strong>Share</strong> di toolbar bawah Safari.
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left p-3 bg-gray-50 rounded-xl">
                <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                  <PlusSquare size={24} className="text-black" />
                </div>
                <div className="text-sm">
                  2. Scroll ke bawah dan pilih menu <strong>"Add to Home Screen"</strong>.
                </div>
              </div>

              <div className="flex items-center gap-4 text-left p-3 bg-gray-50 rounded-xl">
                <div className="bg-white p-2 rounded-lg shadow-sm shrink-0">
                  <span className="font-bold text-blue-600 text-sm px-1">Add</span>
                </div>
                <div className="text-sm">
                  3. Tap <strong>Add</strong> di pojok kanan atas layar.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full mt-6 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg active:scale-95 transform transition-transform"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}
