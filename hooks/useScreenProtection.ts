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
  contentTitle?: string; // New: To identify which content is being protected
  onScreenshotAttempt?: () => void;
  onRecordingDetected?: () => void;
  videoElementRef?: React.RefObject<HTMLVideoElement | null>;
  authFetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
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
    contentTitle = '', // New: context for logging
    onScreenshotAttempt,
    onRecordingDetected,
    videoElementRef,
    authFetch,
  } = options;

  const [isBlurred, setIsBlurred] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [isViolation, setIsViolation] = useState(false);
  const isViolationRef = useRef(false); // Track secara sinkron
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

  // Helper to use either authFetch or global fetch
  const secureFetch = useCallback((input: RequestInfo, init?: RequestInit) => {
    if (authFetch) return authFetch(input, init);
    return fetch(input, init);
  }, [authFetch]);

  // Corrupt the clipboard with warning message repeatedly.
  // Snipping Tool delays copying image until the user finishes drawing the rectangle.
  // We spam the clipboard for 5 seconds to ensure we overwrite the Snipping Tool's payload!
  const polluteClipboard = useCallback(() => {
    let attempts = 0;
    const intervalId = setInterval(() => {
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText('⚠️ ALFAJR SECURITY: Pelanggaran terdeteksi! Konten ini dilindungi hak cipta eksklusif. Dilarang melakukan screenshot atau perekaman layar.');
        }
      } catch (e) {
        // Ignore permission/activation errors
      }
      
      attempts++;
      if (attempts >= 10) { // 5 seconds (10 * 500ms)
        clearInterval(intervalId);
      }
    }, 500);
  }, []);

  // Helper function to pause video
  const pauseVideo = useCallback(() => {
    if (videoElementRef?.current) {
      try {
        videoElementRef.current.pause();
      } catch (e) {
        console.warn('Failed to auto-pause video:', e);
      }
    }
  }, [videoElementRef]);

  // Sangat agresif: sembunyikan video SEDETIK SEBELUM OS membekukan layar untuk screenshot
  const hideVideoSynchronously = useCallback(() => {
    // 1. Keluarkan dari Fullscreen BILA SEDANG FULLSCREEN
    // Ini memaksa browser kembali ke mode normal sehingga overlay (yang dipasang di document.body) MUNCUL!
    if (typeof document !== 'undefined') {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitFullscreenElement) {
        (document as any).webkitExitFullscreen().catch(() => {});
      } else if ((document as any).mozFullScreenElement) {
        (document as any).mozCancelFullScreen().catch(() => {});
      } else if ((document as any).msFullscreenElement) {
        (document as any).msExitFullscreen().catch(() => {});
      }
    }

    if (videoElementRef?.current) {
      try {
        videoElementRef.current.pause();
      } catch (e) {}
      
      // Paksa hilang dari tampilan secara synchronous (level DOM) tanpa nunggu React state
      videoElementRef.current.style.opacity = '0';
      videoElementRef.current.style.visibility = 'hidden';
      videoElementRef.current.style.filter = 'blur(100px)';
    }
  }, [videoElementRef]);

  const showVideoSynchronously = useCallback(() => {
    if (videoElementRef?.current) {
      // Kembalikan seperti semula
      videoElementRef.current.style.opacity = '1';
      videoElementRef.current.style.visibility = 'visible';
      videoElementRef.current.style.filter = 'none';
      // Biarkan user menekan play sendiri
    }
  }, [videoElementRef]);

  // Start countdown timer
  const startCountdown = useCallback((seconds: number) => {
    // Pause video immediately when countdown/violation starts
    pauseVideo();

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
        isViolationRef.current = false;
        setIsBlurred(false);
        setIsCoolDownActive(false);
        setIsDevToolsOpen(false);
        setViolationType(null);
        showVideoSynchronously();
      }
    }, 1000);
  }, [pauseVideo, showVideoSynchronously]);

  // Smart blur detection - hanya trigger jika benar-benar pindah tab/window
  const handleBlur = useCallback(() => {
    if (!enableBlurOnFocusLoss) return;
    
    // ABAIKAN jika protection dinonaktifkan secara global (misal saat modal upload buka)
    if (typeof window !== 'undefined' && window.disableScreenProtection) {
      return;
    }
    
    // ABAIKAN jika sedang memilih file
    if (typeof window !== 'undefined' && window.isPickingFile) {
      console.log('File picker detected, skipping blur protection');
      return;
    }

    // Eksekusi super agresif, tanpa delay.
    // document.hasFocus() mendeteksi hilangnya fokus (Alt+tab/Pindah jendela).
    // Bahkan jika klik iframe (seperti vdo cipher), document.hasFocus() tetap true.
    if (document.hidden || !document.hasFocus()) {
      // Jika sedang dalam violation (contoh: 10 detik dari keyboard), abaikan blur
      if (isViolationRef.current) return;

      // Jika bukan fullscreen blur, pakai blur biasa 5 detik
      hideVideoSynchronously();
      setIsBlurred(true);
      setIsCoolDownActive(false);
      setViolationType('blur');
      setCountdown(5);
      
      // Layar beku pada 5 detik
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }
  }, [enableBlurOnFocusLoss, hideVideoSynchronously, startCountdown, onScreenshotAttempt]);

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
          hideVideoSynchronously();
          setIsViolation(true);
          isViolationRef.current = true;
          setViolationType('screenshot');
          setCountdown(10);
          startCountdown(10);
          
          polluteClipboard(); // Bantai clipboardnya!
          
          onScreenshotAttempt?.();
        }
        
        // Log mobile violation
        secureFetch('/api/security/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: action,
            page: window.location.pathname,
            details: { 
              userAgent: navigator.userAgent,
              contentTitle: contentTitle, // Pass content title
              ...event.details 
            },
          }),
        }).catch(() => {});
      });
      
      return cleanup;
    }
  }, [startCountdown, onScreenshotAttempt, secureFetch]);

  const handleFocus = useCallback(() => {
    if (!enableBlurOnFocusLoss) return;

    // ABAIKAN jika protection dinonaktifkan secara global
    if (typeof window !== 'undefined' && window.disableScreenProtection) {
      return;
    }

    // Check if we were picking a file
    const wasPicking = typeof window !== 'undefined' && window.isPickingFile;

    // Reset picking flag saat kembali fokus
    if (typeof window !== 'undefined') {
      window.isPickingFile = false;
    }

    // If returning from file picker, don't trigger protection
    if (wasPicking) {
      return;
    }

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

    // Reset states immediately on focus, UNLESS we are returning from a blur
    if (isBlurred && violationType === 'blur') {
      // User kembali ke layar, mulai countdown dari 5
      setIsBlurred(false);
      setIsCoolDownActive(true);
      startCountdown(5);
      return;
    }

    // Jika masuk ke sini, artinya bukan dari blur atau countdown sudah selesai
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

  // Enhanced keyboard detection dengan deteksi lengkap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableKeyboardBlock) return;
      if (typeof window !== 'undefined' && window.disableScreenProtection) return;

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
        hideVideoSynchronously();
        if (preventDefaultAction) {
          e.preventDefault();
          e.stopPropagation();
        }
        
        attemptCountRef.current++;
        
        // Flag sebagai violation dengan countdown
        setIsViolation(true);
        isViolationRef.current = true;
        setViolationType('screenshot');
        setCountdown(10);
        startCountdown(10);
        
        // Clear clipboard secara agresif berkali-kali
        polluteClipboard();
        
        onScreenshotAttempt?.();
      }
    };

    // Gunakan capture phase di level window untuk prioritas absolut pertama
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyDown, true);
    };
  }, [enableKeyboardBlock, enableDevToolsDetection, onScreenshotAttempt]);

  // Visibility change & Window Focus detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
      } else {
        handleFocus();
      }
    };

    // Langsung trigger pada event blur tanpa perantara untuk agresivitas maksimal
    window.addEventListener('blur', handleBlur as any);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlur as any);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleBlur, handleFocus]);

  // Context menu blocking
  useEffect(() => {
    if (!enableContextMenuBlock) return;

    const handleContextMenu = (e: MouseEvent) => {
      if (typeof window !== 'undefined' && window.disableScreenProtection) return;
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
      if (typeof window !== 'undefined' && window.disableScreenProtection) return;
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