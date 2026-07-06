"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useScreenProtection } from '@/hooks/useScreenProtection';
import { Shield } from 'lucide-react';
import { PrivacyScreen } from '@capacitor-community/privacy-screen';
import { useAuth } from '@/context/AuthContext';
import { isMobileDevice } from '@/lib/security/mobileProtection';

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
  watermarkText = 'E-LEARNING PORTAL',
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
  // Force disable protections based on User Requirements: 
  // Disable all web protections (watermark, blur, etc.) for all mobile/tablet views
  const forceDisableAllProtections = isMobileDevice();

  useEffect(() => {
    // Still try to enable native PrivacyScreen if available (non-visible protection)
    if (forceDisableAllProtections) {
      PrivacyScreen.enable().catch(() => {});
    }
  }, [forceDisableAllProtections]);

  const finalEnableWatermark = forceDisableAllProtections ? false : enableWatermark;
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
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

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
      // UI warning only — security logging is handled directly in the hook
      if (showWarningOnAttempt) {
        setWarningMessage('⚠️ Screenshot tidak diperbolehkan!');
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
      }
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
    const interval = setInterval(generatePositions, 60000); // Less frequent updates for performance
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
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          -webkit-user-drag: none !important;
        }
        @keyframes float-watermark {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(15px, -15px, 0); }
          50% { transform: translate3d(-15px, 0, 0); }
          75% { transform: translate3d(15px, 15px, 0); }
        }
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
        .watermark-text {
          animation: float-watermark 15s ease-in-out infinite, pulse-opacity 4s ease-in-out infinite;
          pointer-events: none;
          font-family: sans-serif;
          font-weight: 800;
          will-change: transform, opacity;
          backface-visibility: hidden;
          z-index: 999998;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
      `}</style>

      {!forceDisableAllProtections && finalEnableWatermark && watermarkPositions.length > 0 && (
        <div 
          className="fixed inset-0 pointer-events-none z-[999996] overflow-hidden select-none touch-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {watermarkPositions.map((pos, index) => (
            <div
              key={index}
              className="watermark-text absolute text-gray-500/40 whitespace-nowrap select-none pointer-events-none"
              style={{
                top: `${pos.top}%`,
                left: `${pos.left}%`,
                transform: `rotate(${pos.rotation}deg)`,
                fontSize: 'clamp(14px, 2.5vw, 24px)',
                animationDelay: `${index * 3.7}s`,
              }}
            >
              {displayWatermark}
            </div>
          ))}
        </div>
      )}

      {!forceDisableAllProtections && (isViolation || (finalEnableBlur && (isBlurred || isCoolDownActive)) || (finalEnableDevTools && violationType === 'devtools')) && ( 
        <div className="fixed inset-0 z-[999999] bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 flex flex-col items-center justify-center text-white p-4 text-center select-none">
          {/* Top Warning Banner for Screenshot Violation */}
          {violationType === 'screenshot' && (
            <div className="absolute top-8 bg-red-600 px-6 py-2.5 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.5)] flex items-center gap-3 font-bold animate-bounce-short">
              <Shield size={20} className="text-white" fill="white" />
              <span className="flex items-center gap-2">
                <span className="text-xl">⚠️</span> Screenshot tidak diperbolehkan!
              </span>
            </div>
          )}

          <div className="max-w-xl flex flex-col items-center">
            <Shield 
              size={80} 
              className={violationType === 'screenshot' ? "text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" : "text-sky-500 mb-6 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]"} 
              strokeWidth={1.5} 
            />
            
            <h2 className="text-3xl font-bold mb-2 tracking-tight uppercase">
              {violationType === 'screenshot' ? "Keamanan Terdeteksi" : "Konten Terlindungi"}
            </h2>
            
            <p className="text-gray-400 text-lg mb-8 max-w-md">
              {violationType === 'screenshot' 
                ? "Percobaan screenshot atau rekam layar terdeteksi. Konten telah diamankan." 
                : "Menyiapkan konten dengan aman..."}
            </p>
            
            <div className="relative flex items-center justify-center">
              <div className={`w-24 h-24 rounded-full border-[3px] flex items-center justify-center ${
                violationType === 'screenshot' ? "border-red-500/20" : "border-sky-500/20"
              }`}>
                <div className={`absolute inset-0 rounded-full border-[3px] border-t-transparent animate-spin-slow ${
                  violationType === 'screenshot' ? "border-red-500" : "border-sky-500"
                }`}></div>
                <span className={`text-4xl font-bold ${violationType === 'screenshot' ? "text-white" : "text-white"}`}>
                  {countdown > 0 ? countdown : "!"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes bounce-short {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        .animate-bounce-short {
          animation: bounce-short 2s ease-in-out infinite;
        }
      `}</style>

      {!forceDisableAllProtections && showWarning && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[999999] bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 font-bold">
          <Shield size={20} />
          <span>{warningMessage}</span>
        </div>
      )}
    </>
  );

  return (
    <div className={`screen-protected ${className} relative`} ref={wrapperRef} id="screen-protection-wrapper">
      {children}
      {mounted && ReactDOM.createPortal(renderOverlays(), fullscreenElement || document.body)}
    </div>
  );
};

export default ScreenProtection;