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

  const hideVideoSynchronously = useCallback((keepFullscreen: boolean = false) => {
    if (forceDisableAllProtections) return;
    if (typeof document !== 'undefined' && !keepFullscreen) {
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

    // Immediately trigger protection on blur or hidden
    if (document.hidden || !document.hasFocus()) {
      if (isViolationRef.current) return;
      hideVideoSynchronously();
      setIsBlurred(true);
      setViolationType('blur');
      // No countdown yet while blurred, wait until focus returns
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

    // When returning from blur, ALWAYS start a countdown penalty
    if (isBlurred && violationType === 'blur') {
      setIsBlurred(false);
      setIsCoolDownActive(true);
      startCountdown(5); // 5 seconds delay as requested
      return;
    }

    // Aggressive re-check: even if focus seems to return, verify it
    blurDebounceRef.current = setTimeout(() => {
      if (document.hidden || !document.hasFocus()) {
        setIsBlurred(true);
        setViolationType('blur');
        setIsCoolDownActive(true);
        startCountdown(5);
      }
    }, 100); 
  }, [enableBlurOnFocusLoss, startCountdown, pauseVideo, isViolation, isBlurred, violationType, showVideoSynchronously, forceDisableAllProtections]);

  // Aggressive Looping Check
  useEffect(() => {
    if (forceDisableAllProtections || !enableBlurOnFocusLoss) return;

    const interval = setInterval(() => {
      if (document.hidden || !document.hasFocus()) {
        if (!isBlurred && !isViolation && !isCoolDownActive) {
          handleBlur();
        }
      }
    }, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, [handleBlur, isBlurred, isViolation, isCoolDownActive, forceDisableAllProtections, enableBlurOnFocusLoss]);

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

  // === AGGRESSIVE KEYBOARD SCREENSHOT DETECTION (Desktop) ===
  // Intercepts ALL known screenshot shortcuts across Windows/Mac/Linux
  // Triggers IMMEDIATELY: hide video -> block event -> violation -> log -> pollute clipboard
  useEffect(() => {
    if (skipWebListeners) return;
    
    // Aggressive continuous clipboard pollution during violation
    let clipboardPollutionInterval: NodeJS.Timeout | null = null;
    const startAggressiveClipboardPollution = () => {
      if (clipboardPollutionInterval) clearInterval(clipboardPollutionInterval);
      // Immediately pollute
      polluteClipboard();
      // Then keep polluting every 200ms for 12 seconds (covers 10s countdown + buffer)
      let pollCount = 0;
      clipboardPollutionInterval = setInterval(() => {
        try {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText('⚠️ ALFAJR SECURITY: Pelanggaran terdeteksi! Konten ini dilindungi hak cipta eksklusif. Screenshot/rekaman layar DILARANG KERAS.');
          }
          // Also try to clear via execCommand as fallback
          const textarea = document.createElement('textarea');
          textarea.value = '⚠️ KONTEN DILINDUNGI - ALFAJR E-LEARNING';
          textarea.style.position = 'fixed';
          textarea.style.left = '-9999px';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        } catch (e) {}
        pollCount++;
        if (pollCount >= 60) { // 60 * 200ms = 12 seconds
          if (clipboardPollutionInterval) clearInterval(clipboardPollutionInterval);
        }
      }, 200);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableKeyboardBlock || (typeof window !== 'undefined' && window.disableScreenProtection)) return;

      let isScreenshotAttempt = false;
      let detectedShortcut = '';
      
      const key = (e.key || '').toUpperCase();
      const code = e.code || '';

      // ─── PrintScreen variants (ALL platforms) ───
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44 || code === 'PrintScreen';
      if (isPrintScreen) {
        isScreenshotAttempt = true;
        detectedShortcut = e.altKey ? 'Alt+PrintScreen' : e.metaKey ? 'Win+PrintScreen' : e.ctrlKey ? 'Ctrl+PrintScreen' : 'PrintScreen';
      }

      // ─── Windows Screenshot Shortcuts ───
      // Win+Shift+S (Snipping Tool / Snip & Sketch)
      if ((e.metaKey || e.getModifierState?.('OS') || e.getModifierState?.('Meta')) && e.shiftKey && key === 'S') {
        isScreenshotAttempt = true;
        detectedShortcut = 'Win+Shift+S (Snipping Tool)';
      }
      // Win+Shift+R (possible screen recording / Xbox Game Bar)
      if ((e.metaKey || e.getModifierState?.('OS')) && e.shiftKey && key === 'R') {
        isScreenshotAttempt = true;
        detectedShortcut = 'Win+Shift+R (Recording)';
      }
      // Ctrl+Shift+S (various snipping tools)
      if (e.ctrlKey && e.shiftKey && key === 'S') {
        isScreenshotAttempt = true;
        detectedShortcut = 'Ctrl+Shift+S (Snipping)';
      }
      // Win+G (Xbox Game Bar)
      if ((e.metaKey || e.getModifierState?.('OS')) && key === 'G') {
        isScreenshotAttempt = true;
        detectedShortcut = 'Win+G (Xbox Game Bar)';
      }
      // Win+Alt+PrintScreen (Xbox Game Bar Screenshot)
      if ((e.metaKey || e.getModifierState?.('OS')) && e.altKey && isPrintScreen) {
        isScreenshotAttempt = true;
        detectedShortcut = 'Win+Alt+PrintScreen (Game Bar)';
      }
      // Win+Alt+R (Xbox Game Bar Record)
      if ((e.metaKey || e.getModifierState?.('OS')) && e.altKey && key === 'R') {
        isScreenshotAttempt = true;
        detectedShortcut = 'Win+Alt+R (Game Bar Record)';
      }

      // ─── macOS Screenshot Shortcuts ───
      // Cmd+Shift+3 (full screen), Cmd+Shift+4 (selection), Cmd+Shift+5 (screenshot panel)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        isScreenshotAttempt = true;
        detectedShortcut = `Cmd+Shift+${e.key} (macOS Screenshot)`;
      }
      // Cmd+Shift+6 (Touch Bar screenshot)
      if (e.metaKey && e.shiftKey && e.key === '6') {
        isScreenshotAttempt = true;
        detectedShortcut = 'Cmd+Shift+6 (Touch Bar)';
      }
      // Cmd+Ctrl+Shift+3/4 (screenshot to clipboard on mac)
      if (e.metaKey && e.ctrlKey && e.shiftKey && ['3', '4'].includes(e.key)) {
        isScreenshotAttempt = true;
        detectedShortcut = `Cmd+Ctrl+Shift+${e.key} (macOS clipboard)`;
      }

      // ─── Linux Screenshot Shortcuts ───
      // Ctrl+Shift+Print (common in GNOME)
      if (e.ctrlKey && e.shiftKey && isPrintScreen) {
        isScreenshotAttempt = true;
        detectedShortcut = 'Ctrl+Shift+PrintScreen (Linux)';
      }

      // ─── DevTools Shortcuts (if enabled) ───
      if (enableDevToolsDetection) {
        const isDevToolsShortcut = e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(key)) || 
          (e.metaKey && e.altKey && ['I', 'J', 'C'].includes(key));
        if (isDevToolsShortcut) {
          isScreenshotAttempt = true;
          detectedShortcut = `DevTools (${e.key})`;
        }
      }

      // ─── TRIGGER AGGRESSIVE PROTECTION ───
      if (isScreenshotAttempt) {
        // STEP 1: IMMEDIATELY hide video content (synchronous, fastest possible)
        // Pass true to keep the browser in fullscreen mode so the overlay shows ON TOP
        hideVideoSynchronously(true);
        
        // STEP 2: Block the event completely
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // STEP 3: Set violation state
        setIsViolation(true);
        isViolationRef.current = true;
        setViolationType('screenshot');
        
        // STEP 4: Clear any existing countdowns and start a fresh 10s penalty
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        startCountdown(10);
        
        // STEP 5: Start aggressive continuous clipboard pollution
        startAggressiveClipboardPollution();
        
        // STEP 5.5: Dispatch custom event for in-player overlay (works even in fullscreen)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('alfajr-screenshot-violation', { detail: { countdown: 10 } }));
        }
        
        // STEP 6: Fire the callback (for UI warning banner)
        onScreenshotAttempt?.();
        
        // STEP 7: DIRECTLY send security log to API (guaranteed logging, not relying only on callback)
        secureFetch('/api/security/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'screenshot_attempt',
            page: typeof window !== 'undefined' ? window.location.pathname : '',
            details: {
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
              contentTitle,
              shortcut: detectedShortcut,
              platform: typeof navigator !== 'undefined' ? navigator.platform : '',
              timestamp: new Date().toISOString(),
            },
          }),
        }).catch(() => {});
      }
    };

    // Also intercept keyup for PrintScreen (some browsers fire it on keyup only)
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!enableKeyboardBlock || (typeof window !== 'undefined' && window.disableScreenProtection)) return;
      
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44 || (e.code || '') === 'PrintScreen';
      if (isPrintScreen && !isViolationRef.current) {
        hideVideoSynchronously(true);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        setIsViolation(true);
        isViolationRef.current = true;
        setViolationType('screenshot');
        
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        startCountdown(10);
        startAggressiveClipboardPollution();
        
        // Dispatch custom event for in-player overlay 
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('alfajr-screenshot-violation', { detail: { countdown: 10 } }));
        }
        
        onScreenshotAttempt?.();
        
        secureFetch('/api/security/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'screenshot_attempt',
            page: typeof window !== 'undefined' ? window.location.pathname : '',
            details: {
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
              contentTitle,
              shortcut: 'PrintScreen (keyup)',
              platform: typeof navigator !== 'undefined' ? navigator.platform : '',
              timestamp: new Date().toISOString(),
            },
          }),
        }).catch(() => {});
      }
    };

    // Register with capture phase (true) to intercept BEFORE anything else
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      if (clipboardPollutionInterval) clearInterval(clipboardPollutionInterval);
    };
  }, [skipWebListeners, enableKeyboardBlock, enableDevToolsDetection, onScreenshotAttempt, hideVideoSynchronously, startCountdown, polluteClipboard, secureFetch, contentTitle]);

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