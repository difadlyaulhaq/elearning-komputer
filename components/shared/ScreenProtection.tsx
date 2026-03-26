"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useScreenProtection } from '@/hooks/useScreenProtection';
import { requestDeviceMotionPermission, isMobileDevice } from '@/lib/security/mobileProtection';
import { Shield, Eye, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import DownloadAppButton from '@/components/shared/DownloadAppButton';

interface ScreenProtectionProps {
  children: React.ReactNode; // The content to be protected.
  watermarkText?: string; // Custom text for the watermark.
  userEmail?: string; // User's email to be included in the watermark for personalization.
  enableWatermark?: boolean; // Controls rendering of dynamic watermarks.
  enableBlurOnFocusLoss?: boolean; // Passed to useScreenProtection, controls blur effect.
  enableKeyboardBlock?: boolean; // Passed to useScreenProtection, controls keyboard shortcut blocking.
  enableContextMenuBlock?: boolean; // Passed to useScreenProtection, controls context menu blocking.
  enableDevToolsDetection?: boolean; // Passed to useScreenProtection, controls dev tools detection.
  enableDragBlock?: boolean; // Passed to useScreenProtection, controls drag blocking.
  showWarningOnAttempt?: boolean; // Controls visibility of the toast warning on screenshot attempts.
  videoElementRef?: React.RefObject<HTMLVideoElement | null>; // Reference to a video element for specific protection.
  className?: string; // Additional CSS classes for the main wrapper.
}

export const ScreenProtection: React.FC<ScreenProtectionProps> = ({
  children,
  watermarkText = 'ALFAJR E-LEARNING', // Default watermark text.
  userEmail,
  // These props control the enabling/disabling of various protection features.
  // Set them to `false` in the component's usage to disable a specific feature.
  enableWatermark = true,
  enableBlurOnFocusLoss = true,
  enableKeyboardBlock = true,
  enableContextMenuBlock = true,
  enableDevToolsDetection = true,
  enableDragBlock = true,
  showWarningOnAttempt = true, // Set to `false` to disable the warning toast.
  videoElementRef,
  className = '',
}) => {
  const [showWarning, setShowWarning] = useState(false); // State for the warning toast.
  const [warningMessage, setWarningMessage] = useState(''); // Message for the warning toast.
  const [watermarkPositions, setWatermarkPositions] = useState<
    Array<{ top: number; left: number; rotation: number; opacity: number }>
  >([]); // Positions for dynamic watermarks.
  const [fullscreenElement, setFullscreenElement] = useState<Element | null>(null);

  // Monitor fullscreen changes to ensure protection stays on top
  useEffect(() => {
    const handleFullscreenChange = async () => {
      const fsElement = document.fullscreenElement || 
                       (document as any).webkitFullscreenElement || 
                       (document as any).mozFullScreenElement || 
                       (document as any).msFullscreenElement;
      
      setFullscreenElement(fsElement);

      // In native platforms, re-verify PrivacyScreen is enabled on fullscreen
      if (fsElement && Capacitor.isNativePlatform()) {
        try {
          // Explicitly re-enable to ensure FLAG_SECURE is active in the fullscreen context
          await PrivacyScreen.enable();
        } catch (e) {
          console.warn('PrivacyScreen.enable failed during fullscreen transition:', e);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const { authFetch } = useAuth();

  // Use the `useScreenProtection` hook to get the current security state.
  const { isBlurred, isRecording, isDevToolsOpen, isViolation, isCoolDownActive, countdown, violationType } = useScreenProtection({
    enableWatermark,
    enableBlurOnFocusLoss,
    enableKeyboardBlock,
    enableContextMenuBlock,
    enableDevToolsDetection,
    enableDragBlock,
    watermarkText,
    videoElementRef,
    authFetch, // Pass authFetch to the hook
    onScreenshotAttempt: () => {
      if (showWarningOnAttempt) {
        setWarningMessage('⚠️ Screenshot tidak diperbolehkan!');
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
      authFetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'screenshot_attempt',
          page: window.location.pathname,
          details: { userAgent: navigator.userAgent, fullscreen: !!document.fullscreenElement },
        }),
      }).catch(console.error);
    },
    onRecordingDetected: () => {
      if (showWarningOnAttempt) {
        setWarningMessage('⚠️ Screen recording terdeteksi!');
        setShowWarning(true);
      }
      authFetch('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recording_detected',
          page: window.location.pathname,
          details: { userAgent: navigator.userAgent, fullscreen: !!document.fullscreenElement },
        }),
      }).catch(console.error);
    },
  });

  // Dynamic watermark positions
  useEffect(() => {
    if (!enableWatermark) return;

    const generatePositions = () => {
      const positions = [];
      for (let i = 0; i < 4; i++) { // Generate 4 watermarks for better coverage
        positions.push({
          top: Math.random() * 80 + 10,
          left: Math.random() * 80 + 10,
          rotation: Math.random() * 40 - 20,
          opacity: 0,
        });
      }
      setWatermarkPositions(positions);
    };

    generatePositions();
    const interval = setInterval(generatePositions, 20000); // More frequent updates
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

  // Overlay content to be portaled
  const renderOverlays = () => (
    <>
      <style jsx global>{`
        .screen-protected {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
        }
        @keyframes float-watermark {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(8px, -10px, 0); }
          50% { transform: translate3d(-8px, 0, 0); }
          75% { transform: translate3d(8px, 10px, 0); }
        }
        .watermark-text {
          animation: float-watermark 20s ease-in-out infinite;
          pointer-events: none;
          font-family: sans-serif;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
          will-change: transform;
          backface-visibility: hidden;
          z-index: 999998;
        }
        /* CSS to hide elements during screenshot on some browsers */
        @media print {
          body { display: none !important; }
        }
      `}</style>

      {enableWatermark && watermarkPositions.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[999996] overflow-hidden">
          {watermarkPositions.map((pos, index) => (
            <div
              key={index}
              className="watermark-text absolute text-gray-500/30 whitespace-nowrap select-none"
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                transform: `rotate(${pos.rotation}deg)`,
                fontSize: 'clamp(12px, 2vw, 20px)',
                animationDelay: `${index * 5}s`,
              }}
            >
              {displayWatermark}
            </div>
          ))}
        </div>
      )}

      {(isViolation || isDevToolsOpen || isBlurred || isCoolDownActive) && ( 
        <div 
          className="fixed inset-0 z-[999999] bg-black flex items-center justify-center text-white p-4 text-center pointer-events-auto transition-opacity duration-200" 
          style={{ opacity: 1 }}
        >
          <div className="max-w-xl">
            {isViolation && (
              <>
                <Shield size={64} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-3 uppercase">Keamanan Terdeteksi</h2>
                <p className="text-base md:text-lg text-gray-300">
                  Percobaan screenshot atau rekam layar terdeteksi. Konten telah diamankan.
                </p>
                {countdown > 0 && (
                  <div className="mt-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-red-500 mb-3">
                      <span className="text-4xl font-bold">{countdown}</span>
                    </div>
                  </div>
                )}
              </>
            )}
            {isDevToolsOpen && !isViolation && (
              <>
                <Shield size={64} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-3">DevTools Terdeteksi</h2>
                <p className="text-base md:text-lg text-gray-300">Harap tutup Developer Tools.</p>
              </>
            )}
            {(isBlurred || isCoolDownActive) && !isViolation && !isDevToolsOpen && (
              <>
                <Shield size={64} className="mx-auto text-[#C5A059] mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Konten Terlindungi</h2>
                <p className="text-base md:text-lg text-gray-300">
                  {isCoolDownActive ? 'Menyiapkan konten dengan aman...' : 'Halaman tidak aktif. Kembali untuk melihat.'}
                </p>
                {countdown > 0 && isCoolDownActive && (
                  <div className="mt-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 border-[#C5A059] mb-3">
                      <span className="text-4xl font-bold">{countdown}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showWarning && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[999999] bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold animate-bounce">
          <Shield size={24} />
          <span>{warningMessage}</span>
        </div>
      )}
    </>
  );

  return (
    <div className={`screen-protected ${className}`}>
      {children}
      {mounted && ReactDOM.createPortal(renderOverlays(), fullscreenElement || document.body)}
    </div>
  );
};

export default ScreenProtection;