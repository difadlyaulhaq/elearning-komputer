// hooks/useScreenProtection.ts
"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { isMobileDevice, initializeMobileProtection } from '@/lib/security/mobileProtection';

interface ScreenProtectionOptions {
  enableWatermark?: boolean;
  enableBlurOnFocusLoss?: boolean;
  enableKeyboardBlock?: boolean;
  enableContextMenuBlock?: boolean;
  enableDevToolsDetection?: boolean;
  enableDragBlock?: boolean;
  forceDisableAllProtections?: boolean; 
  watermarkText?: string;
  contentTitle?: string; 
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

  // Simplified detection for mobile/tablet based on UA only
  const isMobile = isMobileDevice();

  // Web-layer listeners are skipped if forceDisableAllProtections is true (which is set for mobile/tablet)
  const skipWebListeners = forceDisableAllProtections;

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
    if (forceDisableAllProtections) return;
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
  }, [forceDisableAllProtections]);

  const pauseVideo = useCallback(() => {
    if (videoElementRef?.current) {
      try { videoElementRef.current.pause(); } catch (e) {}
    }
  }, [videoElementRef]);

  const hideVideoSynchronously = useCallback(() => {
    if (forceDisableAllProtections) return;
    if (typeof document !== 'undefined') {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }

    if (videoElementRef?.current) {
      try { videoElementRef.current.pause(); } catch (e) {}
      videoElementRef.current.style.opacity = '0';
      videoElementRef.current.style.visibility = 'hidden';
      videoElementRef.current.style.filter = 'blur(100px)';
    }
  }, [videoElementRef, forceDisableAllProtections]);

  const showVideoSynchronously = useCallback(() => {
    if (videoElementRef?.current) {
      videoElementRef.current.style.opacity = '1';
      videoElementRef.current.style.visibility = 'visible';
      videoElementRef.current.style.filter = 'none';
    }
  }, [videoElementRef]);

  const startCountdown = useCallback((seconds: number) => {
    if (forceDisableAllProtections) return;
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
  }, [pauseVideo, showVideoSynchronously, forceDisableAllProtections]);

  // Clear blur if protection is disabled
  useEffect(() => {
    if (forceDisableAllProtections) {
      if (isBlurred || isViolation || isCoolDownActive) {
        setIsBlurred(false);
        setIsViolation(false);
        setIsCoolDownActive(false);
        setViolationType(null);
        showVideoSynchronously();
      }
      return;
    }
    if (!enableBlurOnFocusLoss && isBlurred && violationType === 'blur') {
      setIsBlurred(false);
      setViolationType(null);
      showVideoSynchronously();
    }
  }, [enableBlurOnFocusLoss, isBlurred, isViolation, isCoolDownActive, violationType, showVideoSynchronously, forceDisableAllProtections]);

  const handleBlur = useCallback(() => {
    if (forceDisableAllProtections || !enableBlurOnFocusLoss) return;
    if (typeof window !== 'undefined' && (window.disableScreenProtection || window.isPickingFile)) return;

    if (document.hidden || !document.hasFocus()) {
      if (isViolationRef.current) return;
      hideVideoSynchronously();
      setIsBlurred(true);
      setViolationType('blur');
      setCountdown(5);
    }
  }, [enableBlurOnFocusLoss, hideVideoSynchronously, forceDisableAllProtections]);

  const handleFocus = useCallback(() => {
    if (forceDisableAllProtections || !enableBlurOnFocusLoss) return;
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
    
    blurDebounceRef.current = setTimeout(() => {
      if (document.hidden || !document.hasFocus()) {
        setIsBlurred(true);
        setViolationType('blur');
        setCountdown(5);
        startCountdown(5);
      } else {
        setCountdown(0);
        showVideoSynchronously();
      }
    }, 500); 
  }, [enableBlurOnFocusLoss, startCountdown, pauseVideo, isViolation, isBlurred, violationType, showVideoSynchronously, forceDisableAllProtections]);

  // Mobile gestures detection - Still registered for mobile web if not blocked by skipWebListeners
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

  // Keyboard detection - CRITICAL for Desktop Warning
  useEffect(() => {
    if (skipWebListeners) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableKeyboardBlock || (typeof window !== 'undefined' && window.disableScreenProtection)) return;

      let isScreenshotAttempt = false;
      const isDevToolsShortcut = e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(e.key.toUpperCase()));

      // Enhanced Screenshot Shortcuts: 
      // 1. PrintScreen (Keyboard key)
      // 2. Win + Shift + S (Windows Snipping Tool) - metaKey + shiftKey + S
      // 3. Cmd + Shift + 4 or 3 or 5 (Mac Screenshot) - metaKey + shiftKey + Number
      const isMacScreenshot = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key);
      const isWinScreenshot = e.metaKey && e.shiftKey && e.key.toUpperCase() === 'S';

      if (e.key === 'PrintScreen' || e.keyCode === 44 || isWinScreenshot || isMacScreenshot || (isDevToolsShortcut && enableDevToolsDetection)) {
        isScreenshotAttempt = true;
      }

      if (isScreenshotAttempt) {
        hideVideoSynchronously();
        e.preventDefault();
        e.stopPropagation();
        
        setIsViolation(true);
        isViolationRef.current = true;
        setViolationType('screenshot');
        startCountdown(10); // Maintain 10 second countdown
        polluteClipboard();
        onScreenshotAttempt?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [skipWebListeners, enableKeyboardBlock, enableDevToolsDetection, onScreenshotAttempt, hideVideoSynchronously, startCountdown, polluteClipboard]);

  // Blur & Focus detection
  useEffect(() => {
    if (forceDisableAllProtections) return;
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
  }, [handleBlur, handleFocus, forceDisableAllProtections]);

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
      if (isDevOpen) {
        setViolationType('devtools');
      }
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