// hooks/useScreenProtection.ts
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { isMobileDevice, initializeMobileProtection } from '@/lib/security/mobileProtection';
import { getIsNativeApp } from '@/lib/native-detection';

interface ScreenProtectionOptions {
  enableWatermark?: boolean;
  enableBlurOnFocusLoss?: boolean;
  enableKeyboardBlock?: boolean;
  enableContextMenuBlock?: boolean;
  enableDevToolsDetection?: boolean;
  enableDragBlock?: boolean;
  forceDisableAllProtections?: boolean; // New prop
  watermarkText?: string;
  contentTitle?: string; // New: To identify which content is being protected
  onScreenshotAttempt?: () => void;
  onRecordingDetected?: () => void;
  videoElementRef?: React.RefObject<HTMLVideoElement | null>;
  authFetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

export const useScreenProtection = (options: ScreenProtectionOptions = {}) => {
  const {
    enableBlurOnFocusLoss = true,
    enableKeyboardBlock = true,
    enableContextMenuBlock = true,
    enableDevToolsDetection = true,
    enableDragBlock = true,
    forceDisableAllProtections = false,
    contentTitle = '',
    onScreenshotAttempt,
    videoElementRef,
    authFetch,
  } = options;

  // 0. IMMEDIATE EXIT if all protections are forced off (e.g., Native APK Video Page)
  if (forceDisableAllProtections) {
    return {
      isBlurred: false,
      isRecording: false,
      isDevToolsOpen: false,
      isViolation: false,
      isCoolDownActive: false,
      countdown: 0,
      violationType: null,
    };
  }

  // Differentiate between Native App and Mobile Browser
  const [isNativeApp, setIsNativeApp] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getIsNativeApp();
  });

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return isMobileDevice();
  });

  useEffect(() => {
    if (getIsNativeApp()) {
      setIsNativeApp(true);
    }
    
    const handleDetection = () => setIsNativeApp(true);
    window.addEventListener('alfajr_native_detected', handleDetection);
    return () => window.removeEventListener('alfajr_native_detected', handleDetection);
  }, []);

  // Web-layer listeners are skipped in Native App to avoid conflicts with OS/Capacitor features
  const skipWebListeners = isNativeApp;

  const [isBlurred, setIsBlurred] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isViolation, setIsViolation] = useState(false);
  const isViolationRef = useRef(false);
  const [isCoolDownActive, setIsCoolDownActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [violationType, setViolationType] = useState<'screenshot' | 'devtools' | 'blur' | null>(null);
  const attemptCountRef = useRef(0);
  const blurDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const coolDownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const secureFetch = useCallback((input: RequestInfo, init?: RequestInit) => {
    if (authFetch) return authFetch(input, init);
    return fetch(input, init);
  }, [authFetch]);

  const polluteClipboard = useCallback(() => {
    let attempts = 0;
    const intervalId = setInterval(() => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText('⚠️ ALFAJR SECURITY: Pelanggaran terdeteksi! Konten ini dilindungi hak cipta eksklusif. Dilarang melakukan screenshot atau perekaman layar.');
        }
      } catch (e) {}
      
      attempts++;
      if (attempts >= 10) clearInterval(intervalId);
    }, 500);
  }, []);

  const pauseVideo = useCallback(() => {
    if (videoElementRef?.current) {
      try { videoElementRef.current.pause(); } catch (e) {}
    }
  }, [videoElementRef]);

  const hideVideoSynchronously = useCallback(() => {
    if (typeof document !== 'undefined') {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }

    if (videoElementRef?.current) {
      try { videoElementRef.current.pause(); } catch (e) {}
      videoElementRef.current.style.opacity = '0';
      videoElementRef.current.style.visibility = 'hidden';
      videoElementRef.current.style.filter = 'blur(100px)';
    }
  }, [videoElementRef]);

  const showVideoSynchronously = useCallback(() => {
    if (videoElementRef?.current) {
      videoElementRef.current.style.opacity = '1';
      videoElementRef.current.style.visibility = 'visible';
      videoElementRef.current.style.filter = 'none';
    }
  }, [videoElementRef]);

  const startCountdown = useCallback((seconds: number) => {
    pauseVideo();
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    let timeLeft = seconds;
    setCountdown(timeLeft);
    
    countdownIntervalRef.current = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      
      if (timeLeft <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setIsViolation(false);
        isViolationRef.current = false;
        setIsBlurred(false);
        setIsCoolDownActive(false);
        setIsDevToolsOpen(false);
        setViolationType(null);
        showVideoSynchronously();
      }
    }, 1000);
  }, [pauseVideo, showVideoSynchronously]);

  // Clear blur if protection is disabled
  useEffect(() => {
    if (!enableBlurOnFocusLoss && isBlurred && violationType === 'blur') {
      setIsBlurred(false);
      setViolationType(null);
      showVideoSynchronously();
    }
  }, [enableBlurOnFocusLoss, isBlurred, violationType, showVideoSynchronously]);

  const handleBlur = useCallback(() => {
    if (!enableBlurOnFocusLoss) return;
    if (typeof window !== 'undefined' && (window.disableScreenProtection || window.isPickingFile)) return;

    if (document.hidden || !document.hasFocus()) {
      if (isViolationRef.current) return;
      hideVideoSynchronously();
      setIsBlurred(true);
      setViolationType('blur');
      setCountdown(5);
    }
  }, [enableBlurOnFocusLoss, hideVideoSynchronously]);

  const handleFocus = useCallback(() => {
    if (!enableBlurOnFocusLoss) return;
    if (typeof window !== 'undefined' && window.disableScreenProtection) return;

    const wasPicking = typeof window !== 'undefined' && window.isPickingFile;
    if (typeof window !== 'undefined') window.isPickingFile = false;
    if (wasPicking) return;

    if (blurDebounceRef.current) {
      clearTimeout(blurDebounceRef.current);
      blurDebounceRef.current = null;
    }
    
    if (isViolation) return;
    
    if (coolDownTimerRef.current) {
      clearTimeout(coolDownTimerRef.current);
      coolDownTimerRef.current = null;
    }

    if (isBlurred && violationType === 'blur') {
      setIsBlurred(false);
      setIsCoolDownActive(true);
      startCountdown(5);
      return;
    }

    setIsBlurred(false);
    setIsCoolDownActive(false);
    setViolationType(null);
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(0);
    showVideoSynchronously();
  }, [enableBlurOnFocusLoss, isViolation, isBlurred, violationType, startCountdown, showVideoSynchronously]);

  // Mobile gestures detection
  useEffect(() => {
    if (skipWebListeners) return;

    if (isMobile) {
      const cleanup = initializeMobileProtection((event) => {
        attemptCountRef.current++;
        const action = event.type;

        if (['mobile_screenshot_gesture', 'mobile_palm_gesture', 'mobile_hardware_button', 'mobile_hardware_combo', 'mobile_power_double_click'].includes(action)) {
          hideVideoSynchronously();
          setIsViolation(true);
          isViolationRef.current = true;
          setViolationType('screenshot');
          startCountdown(10);
          polluteClipboard();
          onScreenshotAttempt?.();
        }
        
        secureFetch('/api/security/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: action,
            page: window.location.pathname,
            details: { userAgent: navigator.userAgent, contentTitle, ...event.details },
          }),
        }).catch(() => {});
      });
      return cleanup;
    }
  }, [skipWebListeners, isMobile, startCountdown, onScreenshotAttempt, secureFetch, hideVideoSynchronously, polluteClipboard, contentTitle]);

  // Keyboard detection
  useEffect(() => {
    if (skipWebListeners) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableKeyboardBlock || (typeof window !== 'undefined' && window.disableScreenProtection)) return;

      let isScreenshotAttempt = false;
      const isDevToolsShortcut = e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()));

      if (e.key === 'PrintScreen' || e.keyCode === 44 || (e.key.toUpperCase() === 'S' && e.shiftKey && e.metaKey) || (isDevToolsShortcut && enableDevToolsDetection)) {
        isScreenshotAttempt = true;
      }

      if (isScreenshotAttempt) {
        hideVideoSynchronously();
        e.preventDefault();
        e.stopPropagation();
        
        setIsViolation(true);
        isViolationRef.current = true;
        setViolationType('screenshot');
        startCountdown(10);
        polluteClipboard();
        onScreenshotAttempt?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [skipWebListeners, enableKeyboardBlock, enableDevToolsDetection, onScreenshotAttempt, hideVideoSynchronously, startCountdown, polluteClipboard]);

  // Blur & Focus detection (Always enable even in app if we want hide content to work)
  // Wait, the user said "pastikan protection yang ilang cuma watermark".
  // But they also said "hide content ... dimatiin aja ketika di mobile mode" on video pages.
  useEffect(() => {
    // We allow blur detection in the app UNLESS disabled by options
    const handleVisibilityChange = () => {
      if (document.hidden) handleBlur();
      else handleFocus();
    };

    window.addEventListener('blur', handleBlur as any);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur as any);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleBlur, handleFocus]);

  // Context menu & Drag block
  useEffect(() => {
    if (skipWebListeners) return;
    
    const handleContextMenu = (e: MouseEvent) => {
      if (enableContextMenuBlock && (typeof window === 'undefined' || !window.disableScreenProtection)) {
        e.preventDefault();
      }
    };
    
    const handleDragStart = (e: DragEvent) => {
      if (enableDragBlock && (typeof window === 'undefined' || !window.disableScreenProtection)) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [skipWebListeners, enableContextMenuBlock, enableDragBlock]);

  // DevTools detection
  useEffect(() => {
    if (skipWebListeners || !enableDevToolsDetection) return;

    const threshold = 160;
    const checkDevTools = () => {
      const isDevOpen = (window.outerWidth - window.innerWidth > threshold) || (window.outerHeight - window.innerHeight > threshold);
      setIsDevToolsOpen(isDevOpen);
      if (isDevOpen) setViolationType('devtools');
    };

    const interval = setInterval(checkDevTools, 2000);
    return () => clearInterval(interval);
  }, [skipWebListeners, enableDevToolsDetection]);

  return {
    isBlurred,
    isRecording,
    isDevToolsOpen,
    isViolation,
    isCoolDownActive,
    countdown,
    violationType,
  };
};