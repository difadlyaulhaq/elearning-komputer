// components/shared/ScreenProtection.tsx
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useScreenProtection } from '@/hooks/useScreenProtection';
import { requestDeviceMotionPermission, isMobileDevice } from '@/lib/security/mobileProtection';
import { Shield, Eye, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import DownloadAppButton from '@/components/shared/DownloadAppButton';

interface ScreenProtectionProps {
  children: React.ReactNode;
  watermarkText?: string;
  userEmail?: string;
  enableWatermark?: boolean;
  enableBlurOnFocusLoss?: boolean;
  enableKeyboardBlock?: boolean;
  enableContextMenuBlock?: boolean;
  enableDevToolsDetection?: boolean;
  enableDragBlock?: boolean;
  showWarningOnAttempt?: boolean;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
  className?: string;
}

export const ScreenProtection: React.FC<ScreenProtectionProps> = ({
  children,
  watermarkText = 'ALFAJR E-LEARNING',
  userEmail,
  enableWatermark = true,
  enableBlurOnFocusLoss = true,
  enableKeyboardBlock = true,
  enableContextMenuBlock = true,
  enableDevToolsDetection = true,
  enableDragBlock = true,
  showWarningOnAttempt = true,
  videoElementRef,
  className = '',
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [watermarkPositions, setWatermarkPositions] = useState<
    Array<{ top: number; left: number; rotation: number; opacity: number }>
  >([]);
  const [isMobileWeb, setIsMobileWeb] = useState(false);

  // Detect Mobile Web (Not Native App) - CLIENT SIDE BACKUP PROTECTION
  // Primary protection is in Middleware (proxy.ts). This is just a fallback.
  // useEffect(() => {
  //   const checkMobileWeb = () => {
  //     // Logic: Mobile Device + NOT Native App + NOT Download Page
  //     if (
  //       isMobileDevice() && 
  //       !Capacitor.isNativePlatform() && 
  //       window.location.pathname !== '/download-app'
  //     ) {
  //       // Redirect to download page instead of showing overlay
  //       window.location.href = '/download-app';
  //     }
  //   };

  //   checkMobileWeb();
  // }, []);

  const { isBlurred, isRecording, isDevToolsOpen, isViolation, isCoolDownActive, countdown, violationType } = useScreenProtection({
    // ... config
    enableWatermark,
    enableBlurOnFocusLoss,
    enableKeyboardBlock,
    enableContextMenuBlock,
    enableDevToolsDetection,
    enableDragBlock,
    watermarkText,
    videoElementRef,
    onScreenshotAttempt: () => {
      // ... handler
      if (showWarningOnAttempt) {
        setWarningMessage('⚠️ Screenshot tidak diperbolehkan!');
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
      // ... log
      fetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'screenshot_attempt',
          page: window.location.pathname,
          details: { userAgent: navigator.userAgent },
        }),
      }).catch(console.error);
    },
    onRecordingDetected: () => {
       // ... handler
      if (showWarningOnAttempt) {
        setWarningMessage('⚠️ Screen recording terdeteksi!');
        setShowWarning(true);
      }

      fetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recording_detected',
          page: window.location.pathname,
          details: { userAgent: navigator.userAgent },
        }),
      }).catch(console.error);
    },
  });

  // ... (rest of the hooks)

  // Generate floating watermark positions
  useEffect(() => {
    if (!enableWatermark) return;

    const generatePositions = () => {
      const positions = [];
      for (let i = 0; i < 3; i++) {
        positions.push({
          top: Math.random() * 85 + 5,
          left: Math.random() * 85 + 5,
          rotation: Math.random() * 30 - 15,
          opacity: 0,
        });
      }
      setWatermarkPositions(positions);
    };

    generatePositions();
    const interval = setInterval(generatePositions, 30000);
    return () => clearInterval(interval);
  }, [enableWatermark]);

  const displayWatermark = useMemo(() => {
    if (userEmail) {
      return `${watermarkText} • ${userEmail}`;
    }
    return watermarkText;
  }, [watermarkText, userEmail]);

  useEffect(() => {
    const handleUserInteraction = async () => {
      await requestDeviceMotionPermission();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <style jsx global>{`
        .screen-protected {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          touch-action: manipulation;
        }
        .screen-protected * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        @keyframes float-watermark {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(6px, -8px, 0); }
          50% { transform: translate3d(-6px, 0, 0); }
          75% { transform: translate3d(6px, 8px, 0); }
        }
        .watermark-text {
          animation: float-watermark 25s ease-in-out infinite;
          pointer-events: none;
          font-family: 'Arial', sans-serif;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.15);
          will-change: transform;
          backface-visibility: hidden;
          transform: translateZ(0);
          -webkit-font-smoothing: antialiased;
        }
        @keyframes pulse-warning {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.95; }
        }
        .warning-pulse {
          animation: pulse-warning 0.4s ease-in-out 2;
        }
        @keyframes countdown-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        .countdown-circle {
          animation: countdown-pulse 1s ease-in-out infinite;
        }
        .anti-screenshot-pattern {
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.005) 3px, rgba(0,0,0,0.005) 6px),
                      repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.005) 3px, rgba(0,0,0,0.005) 6px);
          pointer-events: none; z-index: 999997; mix-blend-mode: multiply; opacity: 0.8;
        }
      `}</style>

      {/* REMOVED: Mobile App Enforcer Overlay (Replaced by Client Redirect logic above) */}
      
      {/* Anti-Screenshot Pattern */}
      <div className="anti-screenshot-pattern" />

      {/* Floating Watermarks */}
      {enableWatermark && watermarkPositions.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[999996] overflow-hidden">
          {watermarkPositions.map((pos, index) => (
            <div
              key={index}
              className="watermark-text absolute text-gray-400 whitespace-nowrap select-none"
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                transform: `rotate(${pos.rotation}deg) translateZ(0)`,
                opacity: 0.35,
                fontSize: '16px',
                animationDelay: `${index * 8.3}s`,
              }}
            >
              {displayWatermark}
            </div>
          ))}
        </div>
      )}

      {/* Global Security Overlay */}
      {(isViolation || isDevToolsOpen || isBlurred || isCoolDownActive) && ( 
        <div 
          className="fixed inset-0 z-[999999] bg-black flex items-center justify-center text-white p-4 text-center pointer-events-auto transition-opacity duration-200" 
          style={{ opacity: 0.98 }}
        >
          <div className="max-w-xl">
            {isViolation && (
              <>
                <Shield size={64} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-3">PELANGGARAN TERDETEKSI!</h2>
                <p className="text-base md:text-lg text-gray-300">
                  Aktivitas mencurigakan terdeteksi (percobaan screenshot/rekam layar).
                  Konten disembunyikan sebagai tindakan keamanan.
                </p>
                {countdown > 0 && (
                  <div className="mt-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-4 border-red-500 mb-3 countdown-circle">
                      <span className="text-4xl font-bold">{countdown}</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Anda dapat melanjutkan setelah <span className="text-white font-semibold">{countdown} detik</span>
                    </p>
                  </div>
                )}
              </>
            )}
            {isDevToolsOpen && !isViolation && (
              <>
                <Shield size={64} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Developer Tools Terdeteksi!</h2>
                <p className="text-base md:text-lg text-gray-300">
                  Harap tutup Developer Tools untuk melanjutkan.
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-gray-400">
                    Menunggu Developer Tools ditutup...
                  </p>
                </div>
              </>
            )}
            {(isBlurred || isCoolDownActive) && !isViolation && !isDevToolsOpen && (
              <>
                <Shield size={64} className="mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Konten Disembunyikan</h2>
                <p className="text-base md:text-lg text-gray-300">
                  {isBlurred && !isCoolDownActive 
                    ? 'Konten disembunyikan karena Anda meninggalkan halaman. Kembali ke halaman ini untuk melanjutkan.'
                    : 'Memverifikasi keamanan sebelum menampilkan konten...'}</p>
                {countdown > 0 && isCoolDownActive && (
                  <div className="mt-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-500/20 border-4 border-yellow-500 mb-3 countdown-circle">
                      <span className="text-4xl font-bold">{countdown}</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Anda dapat melanjutkan setelah <span className="text-white font-semibold">{countdown} detik</span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Recording Warning */}
      {isRecording && (
        <div className="fixed top-4 right-4 z-[999999] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <Eye size={20} />
          <span className="font-semibold text-sm">Recording Terdeteksi!</span>
        </div>
      )}

      {/* Warning Toast */}
      {showWarning && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[999999] bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl warning-pulse">
          <div className="flex items-center gap-3">
            <Shield size={22} />
            <span className="font-bold text-base">{warningMessage}</span>
          </div>
        </div>
      )}

      {children}

      {mounted && ReactDOM.createPortal(<></>, document.body)}
    </>
  );
};

export default ScreenProtection;