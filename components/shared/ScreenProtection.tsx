"use client";

import React, { useEffect, useState, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useScreenProtection } from '@/hooks/useScreenProtection';
import { requestDeviceMotionPermission, isMobileDevice } from '@/lib/security/mobileProtection';
import { Shield, Eye, Smartphone } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
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
  videoElementRef?: React.RefObject<HTMLVideoElement>; // Reference to a video element for specific protection.
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
  const [isMobileWeb, setIsMobileWeb] = useState(false); // State for mobile web detection.

  // --- Mobile App Enforcer (Currently commented out) ---
  // This `useEffect` block provides a client-side backup mechanism to redirect users
  // on mobile web browsers to a download page, encouraging native app usage.
  // The primary protection for this logic is often handled in middleware (e.g., `proxy.ts`)
  // for better security and performance.
  //
  // To re-enable this client-side mobile web enforcement:
  // 1. Uncomment the entire `useEffect` block below.
  // 2. Ensure `/download-app` is a valid route.
  // 3. This will redirect any mobile device that is *not* a Capacitor native app
  //    and is *not* already on the download page.

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

  // Use the `useScreenProtection` hook to get the current security state.
  // The props `enable...` are passed down to configure the hook's behavior.
  const { isBlurred, isRecording, isDevToolsOpen, isViolation, isCoolDownActive, countdown, violationType } = useScreenProtection({
    // Configuration options passed to the `useScreenProtection` hook.
    enableWatermark, // Passed to the hook, though watermark rendering is handled here.
    enableBlurOnFocusLoss,
    enableKeyboardBlock,
    enableContextMenuBlock,
    enableDevToolsDetection,
    enableDragBlock,
    watermarkText, // Watermark text, passed to the hook for consistent options, but rendered here.
    videoElementRef,
    onScreenshotAttempt: () => {
      // Callback function executed when the hook detects a screenshot attempt.
      if (showWarningOnAttempt) {
        setWarningMessage('⚠️ Screenshot tidak diperbolehkan!');
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000); // Hide warning after 3 seconds.
      }
      // Log the screenshot attempt to the API.
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
       // Callback function executed when screen recording is detected (if implemented in hook).
      if (showWarningOnAttempt) {
        setWarningMessage('⚠️ Screen recording terdeteksi!');
        setShowWarning(true);
      }
      // Log the recording detection to the API.
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

  // `useEffect` for Watermark Positions:
  // Generates and updates the positions of floating watermarks for a dynamic effect.
  useEffect(() => {
    // To disable watermarks, set `enableWatermark` prop to `false`.
    // Or comment out this entire `useEffect` block.
    if (!enableWatermark) return;

    const generatePositions = () => {
      const positions = [];
      for (let i = 0; i < 3; i++) { // Generate 3 watermarks.
        positions.push({
          top: Math.random() * 85 + 5, // Random vertical position (5% to 90%).
          left: Math.random() * 85 + 5, // Random horizontal position (5% to 90%).
          rotation: Math.random() * 30 - 15, // Random rotation (-15 to +15 degrees).
          opacity: 0, // Initial opacity (will be set by CSS).
        });
      }
      setWatermarkPositions(positions);
    };

    generatePositions(); // Generate initial positions on mount.
    const interval = setInterval(generatePositions, 30000); // Regenerate every 30 seconds.
    return () => clearInterval(interval); // Cleanup interval on unmount.
  }, [enableWatermark]);

  // Memoized value for the watermark text, including user email if available.
  const displayWatermark = useMemo(() => {
    if (userEmail) {
      return `${watermarkText} • ${userEmail}`;
    }
    return watermarkText;
  }, [watermarkText, userEmail]);

  // `useEffect` for Device Motion Permission Request:
  // Requests permission for device motion (e.g., gyroscope, accelerometer data) on user interaction.
  // This is sometimes used by mobile security libraries to detect screen recording or physical device manipulation.
  useEffect(() => {
    const handleUserInteraction = async () => {
      await requestDeviceMotionPermission(); // Request permission on first user click/touch.
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

  // Simple state to ensure component is mounted before rendering portals.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      {/* Global CSS styles for screen protection elements. */}
      {/* To disable all custom styles related to protection, you could comment out this `<style jsx global>` block. */}
      <style jsx global>{`
        /* Styles to prevent user selection of text/content */
        .screen-protected {
          -webkit-user-select: none; /* Safari */
          -moz-user-select: none; /* Firefox */
          -ms-user-select: none; /* IE/Edge */
          user-select: none; /* Standard */
          -webkit-touch-callout: none; /* iOS Safari */
          touch-action: manipulation; /* Disable default touch actions */
        }
        .screen-protected * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        /* Keyframe animation for floating watermark effect */
        @keyframes float-watermark {
          0%, 100% { transform: translate3d(0, 0, 0); }
          25% { transform: translate3d(6px, -8px, 0); }
          50% { transform: translate3d(-6px, 0, 0); }
          75% { transform: translate3d(6px, 8px, 0); }
        }
        .watermark-text {
          animation: float-watermark 25s ease-in-out infinite;
          pointer-events: none; /* Watermarks should not interfere with user interaction */
          font-family: 'Arial', sans-serif;
          font-weight: 600;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.15);
          will-change: transform; /* Optimize animation performance */
          backface-visibility: hidden;
          transform: translateZ(0); /* Force hardware acceleration */
          -webkit-font-smoothing: antialiased;
        }
        /* Keyframe animation for pulse effect on warnings */
        @keyframes pulse-warning {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.95; }
        }
        .warning-pulse {
          animation: pulse-warning 0.4s ease-in-out 2;
        }
        /* Keyframe animation for countdown circle pulse */
        @keyframes countdown-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.9; }
        }
        .countdown-circle {
          animation: countdown-pulse 1s ease-in-out infinite;
        }
        /* Subtle pattern to deter screenshots by introducing visual noise */
        .anti-screenshot-pattern {
          position: fixed; inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.005) 3px, rgba(0,0,0,0.005) 6px),
                      repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(0,0,0,0.005) 3px, rgba(0,0,0,0.005) 6px);
          pointer-events: none; /* Should not block user interaction */
          z-index: 999997; /* High z-index to be on top of content but below overlays */
          mix-blend-mode: multiply; /* Blends with content below */
          opacity: 0.8;
        }
      `}</style>

      {/* REMOVED: Mobile App Enforcer Overlay (Replaced by Client Redirect logic above or middleware) */}
      
      {/* Anti-Screenshot Pattern */}
      {/* To disable this subtle pattern, comment out this div. */}
      <div className="anti-screenshot-pattern" />

      {/* Floating Watermarks */}
      {/* To disable watermarks, set `enableWatermark` prop to `false` or comment out this block. */}
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
                animationDelay: `${index * 8.3}s`, // Stagger animation for each watermark.
              }}
            >
              {displayWatermark}
            </div>
          ))}
        </div>
      )}

      {/* Global Security Overlay */}
      {/* This overlay is triggered by various security states (violation, dev tools open, blurred, cool-down). */}
      {/* To disable this entire overlay, comment out this div. */}
      {(isViolation || isDevToolsOpen || isBlurred || isCoolDownActive) && ( 
        <div 
          className="fixed inset-0 z-[999999] bg-black flex items-center justify-center text-white p-4 text-center pointer-events-auto transition-opacity duration-200" 
          style={{ opacity: 0.98 }}
        >
          <div className="max-w-xl">
            {/* Overlay content for a general violation (e.g., screenshot attempt). */}
            {isViolation && (
              <>
                <Shield size={64} className="mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl md:text-3xl font-bold mb-3">PELANGGARAN TERDETEKSI!</h2>
                <p className="text-base md:text-lg text-gray-300">
                  Aktivitas mencurigakan terdeteksi (percobaan screenshot/rekam layar).
                  Konten disembunyikan sebagai tindakan keamanan.
                </p>
                {/* Countdown display for violations. */}
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
            {/* Overlay content for blurred state (focus loss or cool-down). */}
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
      {/* To disable this warning, comment out this block. */}
      {isRecording && (
        <div className="fixed top-4 right-4 z-[999999] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse">
          <Eye size={20} />
          <span className="font-semibold text-sm">Recording Terdeteksi!</span>
        </div>
      )}

      {/* Warning Toast */}
      {/* To disable this warning toast on screenshot attempts, set `showWarningOnAttempt` prop to `false` or comment out this block. */}
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