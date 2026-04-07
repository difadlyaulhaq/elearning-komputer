"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useScreenProtection } from '@/hooks/useScreenProtection';
import { Shield } from 'lucide-react';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { useAuth } from '@/context/AuthContext';
import { getIsNativeApp } from '@/lib/native-detection';
import { usePathname } from 'next/navigation';

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
  contentTitle?: string;
  showWarningOnAttempt?: boolean;
  videoElementRef?: React.RefObject<HTMLVideoElement | null>;
  isVideoPage?: boolean;
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
  contentTitle = '',
  showWarningOnAttempt = true,
  videoElementRef,
  isVideoPage = false,
  className = '',
}) => {
  const pathname = usePathname();
  const [isNativeApp, setIsNativeApp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getIsNativeApp();
  });

  useEffect(() => {
    const isNative = getIsNativeApp();
    setIsNativeApp(isNative);
    
    const handleDetection = () => setIsNativeApp(true);
    window.addEventListener('alfajr_native_detected', handleDetection);

    if (isNative) {
      PrivacyScreen.enable().catch(console.warn);
    }

    return () => {
      window.removeEventListener('alfajr_native_detected', handleDetection);
    };
  }, []);

  // Force disable protections based on User Requirements
  // 1. In Native App, Watermark is ALWAYS GONE
  const finalEnableWatermark = isNativeApp ? false : enableWatermark;

  // 2. In Native App on Video Page, Hide Content (Blur/Violation Overlays) is GONE
  // Detection: explicit prop, video element ref, OR lesson path
  const isLessonPath = pathname?.includes('/lesson/');
  const isVideoInApp = isNativeApp && (isVideoPage || !!videoElementRef || isLessonPath);
  
  // SOLUSI: Guard utama untuk mematikan semua proteksi web di APK
  const forceDisableAllProtections = isVideoInApp;
  
  const finalEnableBlur = forceDisableAllProtections ? false : enableBlurOnFocusLoss;
  const finalEnableKeyboard = forceDisableAllProtections ? false : enableKeyboardBlock;
  const finalEnableContextMenu = forceDisableAllProtections ? false : enableContextMenuBlock;
  const finalEnableDevTools = forceDisableAllProtections ? false : enableDevToolsDetection;
  const finalEnableDrag = forceDisableAllProtections ? false : enableDragBlock;

  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [watermarkPositions, setWatermarkPositions] = useState<
    Array<{ top: number; left: number; rotation: number; opacity: number }>
  >([]);
  const [fullscreenElement, setFullscreenElement] = useState<Element | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = async () => {
      const fsElement = document.fullscreenElement || 
                       (document as any).webkitFullscreenElement || 
                       (document as any).mozFullScreenElement || 
                       (document as any).msFullscreenElement;
      
      setFullscreenElement(fsElement);
      if (fsElement && isNativeApp) {
        PrivacyScreen.enable().catch(() => {});
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isNativeApp]);

  const { authFetch } = useAuth();

  const { isBlurred, isViolation, isCoolDownActive, countdown, violationType } = useScreenProtection({
    enableWatermark: finalEnableWatermark,
    enableBlurOnFocusLoss: finalEnableBlur,
    enableKeyboardBlock: finalEnableKeyboard,
    enableContextMenuBlock: finalEnableContextMenu,
    enableDevToolsDetection: finalEnableDevTools,
    enableDragBlock: finalEnableDrag,
    forceDisableAllProtections, // Pass the guard to the hook
    watermarkText,
    contentTitle,
    videoElementRef,
    authFetch,
    onScreenshotAttempt: () => {
      if (showWarningOnAttempt) {
        setWarningMessage('⚠️ Screenshot tidak diperbolehkan!');
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
      authFetch?.('/api/security/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'screenshot_attempt',
          page: window.location.pathname,
          details: { userAgent: navigator.userAgent, contentTitle },
        }),
      }).catch(() => {});
    },
  });

  useEffect(() => {
    if (!finalEnableWatermark || forceDisableAllProtections) return;
    const generatePositions = () => {
      const positions = [];
      for (let i = 0; i < 4; i++) {
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
    const interval = setInterval(generatePositions, 20000);
    return () => clearInterval(interval);
  }, [finalEnableWatermark, forceDisableAllProtections]);

  const displayWatermark = useMemo(() => {
    return userEmail ? `${watermarkText} • ${userEmail}` : watermarkText;
  }, [watermarkText, userEmail]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const renderOverlays = () => (
    <>
      <style jsx global>{`
        .screen-protected {
          -webkit-user-select: none;
          user-select: none;
        }
        .watermark-text {
          animation: float-watermark 20s ease-in-out infinite;
          pointer-events: none;
          z-index: 999998;
        }
        @keyframes float-watermark {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(10px, 10px, 0); }
        }
      `}</style>

      {!forceDisableAllProtections && finalEnableWatermark && watermarkPositions.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[999996] overflow-hidden">
          {watermarkPositions.map((pos, index) => (
            <div
              key={index}
              className="watermark-text absolute text-gray-500/20 whitespace-nowrap select-none"
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                transform: `rotate(${pos.rotation}deg)`,
                fontSize: 'clamp(10px, 1.5vw, 16px)',
              }}
            >
              {displayWatermark}
            </div>
          ))}
        </div>
      )}

      {!forceDisableAllProtections && (isViolation || (finalEnableBlur && (isBlurred || isCoolDownActive)) || (finalEnableDevTools && violationType === 'devtools')) && ( 
        <div className="fixed inset-0 z-[999999] bg-black flex items-center justify-center text-white p-4 text-center">
          <div className="max-w-xl">
            <Shield size={64} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-3 uppercase">Keamanan Terdeteksi</h2>
            <p className="text-gray-300">Konten diamankan untuk perlindungan hak cipta.</p>
            {countdown > 0 && (
              <div className="mt-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-4 border-red-500">
                  <span className="text-3xl font-bold">{countdown}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {!forceDisableAllProtections && showWarning && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[999999] bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold">
          <Shield size={20} />
          <span>{warningMessage}</span>
        </div>
      )}
    </>
  );

  return (
    <div className={`screen-protected ${className} relative`} ref={wrapperRef} id="alfajr-screen-protection-wrapper">
      {children}
      {mounted && ReactDOM.createPortal(renderOverlays(), fullscreenElement || document.body)}
    </div>
  );
};

export default ScreenProtection;