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
  watermarkText?: string;
  onScreenshotAttempt?: () => void;
  onRecordingDetected?: () => void;
  videoElementRef?: React.RefObject<HTMLVideoElement>;
}

export const useScreenProtection = (options: ScreenProtectionOptions = {}) => {
  const {
    enableWatermark = true,
    enableBlurOnFocusLoss = true,
    enableKeyboardBlock = true,
    enableContextMenuBlock = true,
    enableDevToolsDetection = true,
    enableDragBlock = true, // New option
    watermarkText = 'PROTECTED CONTENT',
    onScreenshotAttempt,
    onRecordingDetected,
    videoElementRef,
  } = options;

  const [isBlurred, setIsBlurred] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isViolation, setIsViolation] = useState(false);
  const [isCoolDownActive, setIsCoolDownActive] = useState(false);
  const [countdown, setCountdown] = useState(0); // Countdown timer state
  const [violationType, setViolationType] = useState<'screenshot' | 'devtools' | 'blur' | null>(null);
  const attemptCountRef = useRef(0);
  const lastBlurTimeRef = useRef(0);
  const blurDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const wasPlayingRef = useRef(false);
  const coolDownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMouseInsideRef = useRef(true); // Track if mouse is inside window

  // Start countdown timer
  const startCountdown = useCallback((seconds: number) => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
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
        // Clear states setelah countdown selesai
        setIsViolation(false);
        setIsBlurred(false);
        setIsCoolDownActive(false);
        setIsDevToolsOpen(false);
        setViolationType(null);
      }
    }, 1000);
  }, []);

  // Smart blur detection - hanya trigger jika benar-benar pindah tab/window
  const handleBlur = useCallback(() => {
    if (!enableBlurOnFocusLoss) return;
    
    // Immediate trigger for mobile devices (Camera, Notification shade, App Switch)
    if (isMobileDevice()) {
      if (blurDebounceRef.current) clearTimeout(blurDebounceRef.current);
      
      setIsBlurred(true);
      setViolationType('blur');
      setCountdown(5);
      startCountdown(5);
      return;
    }

    // Delay blur untuk membedakan antara klik dalam page vs pindah tab (Desktop)
    if (blurDebounceRef.current) {
      clearTimeout(blurDebounceRef.current);
    }
    
    blurDebounceRef.current = setTimeout(() => {
      // Hanya blur jika document benar-benar hidden atau window blur
      if (document.hidden || !document.hasFocus()) {
        setIsBlurred(true);
        setViolationType('blur');
        setCountdown(5);
        startCountdown(5);
      }
    }, 100); // 100ms delay untuk menghindari false trigger
  }, [enableBlurOnFocusLoss, startCountdown]);

  // Initialize mobile protection with gesture support
  useEffect(() => {
    if (isMobileDevice()) {
      const cleanup = initializeMobileProtection((event) => {
        attemptCountRef.current++;

        const action = event.type; // Extract type from ViolationEvent

        // Handle specific mobile violations
        if (action === 'mobile_screenshot_gesture' || 
            action === 'mobile_palm_gesture' || 
            action === 'mobile_hardware_button' ||
            action === 'mobile_hardware_combo' ||
            action === 'mobile_power_double_click') {
          setIsViolation(true);
          setViolationType('screenshot');
          setCountdown(10);
          startCountdown(10);
          
          try {
            navigator.clipboard.writeText('⚠️ Screenshot tidak diizinkan').catch(() => {});
          } catch (error) {}
          
          onScreenshotAttempt?.();
        }
        
        // Log mobile violation
        fetch('/api/security/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: action,
            page: window.location.pathname,
            details: { 
              userAgent: navigator.userAgent,
              ...event.details 
            },
          }),
        }).catch(() => {});
      });
      
      return cleanup;
    }
  }, [startCountdown, onScreenshotAttempt]);

  const handleFocus = useCallback(() => {
    if (!enableBlurOnFocusLoss) return;

    // Clear any pending blur debounce
    if (blurDebounceRef.current) {
      clearTimeout(blurDebounceRef.current);
      blurDebounceRef.current = null;
    }
    
    // Jangan set cooldown jika sedang ada violation lain
    if (isViolation) return;
    
    // Clear any previous cool-down timer
    if (coolDownTimerRef.current) {
      clearTimeout(coolDownTimerRef.current);
      coolDownTimerRef.current = null;
    }

    // Set cool-down active saat focus kembali
    setIsCoolDownActive(true);
    setIsBlurred(true);
    setViolationType('blur');
    setCountdown(5);
    startCountdown(5);
  }, [enableBlurOnFocusLoss, isViolation, startCountdown]);

  // Enhanced keyboard detection dengan deteksi lengkap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableKeyboardBlock) return;

      let isScreenshotAttempt = false;
      let preventDefaultAction = false;

      // PrintScreen key (44 = keyCode untuk PrtSc)
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        isScreenshotAttempt = true;
        preventDefaultAction = true;
      }

      // Windows Snipping Tool (Win + Shift + S)
      if ((e.key === 's' || e.key === 'S') && e.shiftKey && e.metaKey) {
        isScreenshotAttempt = true;
        preventDefaultAction = true;
      }

      // Windows Game Bar (Win + Alt + PrtSc atau Win + G)
      if ((e.key === 'g' || e.key === 'G') && e.metaKey) {
        isScreenshotAttempt = true;
        preventDefaultAction = true;
      }

      // Mac screenshots
      if (e.metaKey && e.shiftKey) {
        // Cmd + Shift + 3 (full screen)
        // Cmd + Shift + 4 (selection)
        // Cmd + Shift + 5 (screen recording)
        if (['3', '4', '5'].includes(e.key)) {
          isScreenshotAttempt = true;
          preventDefaultAction = true;
        }
      }

      // Alt + PrtSc (Active window screenshot)
      if ((e.key === 'PrintScreen' || e.keyCode === 44) && e.altKey) {
        isScreenshotAttempt = true;
        preventDefaultAction = true;
      }

      // Ctrl + PrtSc
      if ((e.key === 'PrintScreen' || e.keyCode === 44) && e.ctrlKey) {
        isScreenshotAttempt = true;
        preventDefaultAction = true;
      }

      // Chrome DevTools shortcuts
      const isDevToolsShortcut = 
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.metaKey && e.altKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key));

      if (isDevToolsShortcut && enableDevToolsDetection) {
        preventDefaultAction = true;
        isScreenshotAttempt = true;
      }

      if (isScreenshotAttempt) {
        if (preventDefaultAction) {
          e.preventDefault();
          e.stopPropagation();
        }
        
        attemptCountRef.current++;
        
        // Flag sebagai violation dengan countdown
        setIsViolation(true);
        setViolationType('screenshot');
        setCountdown(10);
        startCountdown(10);
        
        // Clear clipboard secara agresif
        try {
          navigator.clipboard.writeText('⚠️ Screenshot tidak diizinkan').catch(() => {});
        } catch (error) {
          // Clipboard API tidak tersedia
        }
        
        onScreenshotAttempt?.();
      }
    };

    // Gunakan capture phase untuk menangkap event lebih awal
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyDown, true);
    };
  }, [enableKeyboardBlock, enableDevToolsDetection, onScreenshotAttempt]);

  // Visibility change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [handleBlur, handleFocus]);

  // Track mouse position untuk mencegah false trigger
  useEffect(() => {
    const handleMouseEnter = () => {
      isMouseInsideRef.current = true;
    };
    
    const handleMouseLeave = () => {
      isMouseInsideRef.current = false;
    };
    
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  // Window focus/blur events dengan validasi mouse
  useEffect(() => {
    const smartBlur = (e: FocusEvent) => {
      // Hanya trigger blur jika mouse benar-benar keluar dari window
      if (!isMouseInsideRef.current || document.hidden) {
        handleBlur();
      }
    };
    
    window.addEventListener('blur', smartBlur as any);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', smartBlur as any);
      window.removeEventListener('focus', handleFocus);
    };
  }, [handleBlur, handleFocus]);

  // Context menu blocking
  useEffect(() => {
    if (!enableContextMenuBlock) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Always prevent default if blocking is enabled
      attemptCountRef.current++;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [enableContextMenuBlock]);

  // DevTools detection (optimized)
  useEffect(() => {
    if (!enableDevToolsDetection) return;

    const threshold = 160;
    let devToolsOpen = false;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;

      if ((widthThreshold || heightThreshold) && !devToolsOpen) {
        devToolsOpen = true;
        attemptCountRef.current++;
        setIsDevToolsOpen(true);
        setViolationType('devtools');
        // DevTools tidak perlu countdown karena harus ditutup dulu
      } else if (!widthThreshold && !heightThreshold && devToolsOpen) {
        devToolsOpen = false;
        setIsDevToolsOpen(false);
        if (violationType === 'devtools') {
          setViolationType(null);
        }
      }
    };

    // Kurangi frekuensi check dari 1s menjadi 2s untuk performa lebih baik
    const interval = setInterval(checkDevTools, 2000);
    checkDevTools(); // Check immediately on mount
    
    return () => clearInterval(interval);
  }, [enableDevToolsDetection]);

  // Prevent drag operations
  useEffect(() => {
    if (!enableDragBlock) return;

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault(); // Always prevent default if blocking is enabled
    };

    document.addEventListener('dragstart', handleDragStart);
    return () => document.removeEventListener('dragstart', handleDragStart);
  }, [enableDragBlock]); // Add enableDragBlock to dependency array

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (blurDebounceRef.current) {
        clearTimeout(blurDebounceRef.current);
      }
      if (coolDownTimerRef.current) {
        clearTimeout(coolDownTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  return {
    isBlurred,
    isRecording,
    isDevToolsOpen,
    isViolation,
    isCoolDownActive,
    countdown, // Countdown value
    violationType, // Type of current violation
    attemptCount: attemptCountRef.current,
  };
};