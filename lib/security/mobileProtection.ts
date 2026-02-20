// lib/security/mobileProtection.ts - Enhanced Version

export interface GestureConfig {
  minMultiTouchCount: number;
  palmRadiusThreshold: number;
  palmForceThreshold: number;
  swipeDistanceThreshold: number;
  swipeTimeout: number;
  powerDoubleClickWindow: number;    // Time window for double-click (ms)
  hardwareComboWindow: number;       // Time window for button combo (ms)
}

const DEFAULT_CONFIG: GestureConfig = {
  minMultiTouchCount: 3,
  palmRadiusThreshold: 30,
  palmForceThreshold: 1,
  swipeDistanceThreshold: 50,
  swipeTimeout: 300,
  powerDoubleClickWindow: 400,
  hardwareComboWindow: 500,
};

export interface ViolationEvent {
  type: string;
  timestamp: number;
  details?: any;
}

type ViolationCallback = (event: ViolationEvent) => void;

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
};

export const requestDeviceMotionPermission = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && 
      typeof (window as any).DeviceMotionEvent !== 'undefined' && 
      typeof ((window as any).DeviceMotionEvent as any).requestPermission === 'function') {
    try {
      const permissionState = await ((window as any).DeviceMotionEvent as any).requestPermission();
      return permissionState === 'granted';
    } catch (error) {
      console.error('Error requesting device motion permission:', error);
      return false;
    }
  }
  return true;
};

export const initializeMobileProtection = (
  onViolation?: ViolationCallback,
  customConfig?: Partial<GestureConfig>
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const activePointers = new Map<number, PointerEvent>();
  const swipeStartTimes = new Map<number, number>();
  const swipeStartPositions = new Map<number, { x: number; y: number }>();
  
  // Enhanced hardware key tracking
  const pressedKeys = new Map<string, number>(); // key -> timestamp
  let lastPowerClickTime = 0;
  let powerClickCount = 0;
  let powerClickTimer: NodeJS.Timeout | null = null;
  
  // Volume button tracking
  let lastVolumeDownTime = 0;
  let lastVolumeUpTime = 0;
  
  // Combo detection state
  let comboDetectionTimer: NodeJS.Timeout | null = null;
  let isInComboWindow = false;

  // --- Helper Functions ---

  const detectPalmSwipe = (pointer: PointerEvent): boolean => {
    const p = pointer as any;
    return (
      (p.radiusX > config.palmRadiusThreshold) ||
      (p.radiusY > config.palmRadiusThreshold) ||
      (pointer.pressure > config.palmForceThreshold)
    );
  };

  const detectSwipe = (pointerId: number): boolean => {
    const startTime = swipeStartTimes.get(pointerId);
    const startPos = swipeStartPositions.get(pointerId);
    
    if (!startTime || !startPos) return false;

    const endTime = Date.now();
    const timeDelta = endTime - startTime;

    if (timeDelta > config.swipeTimeout) return false;

    const currentEvent = activePointers.get(pointerId);
    if (!currentEvent) return false;

    const deltaX = Math.abs(currentEvent.clientX - startPos.x);
    const deltaY = Math.abs(currentEvent.clientY - startPos.y);

    return (deltaX > config.swipeDistanceThreshold) || (deltaY > config.swipeDistanceThreshold);
  };

  const checkHardwareCombo = () => {
    const now = Date.now();
    const keysArray = Array.from(pressedKeys.entries());
    
    // Check for Volume Down + Power combination (Android screenshot)
    const volumeDownPressed = keysArray.find(([key]) => 
      key === 'VolumeDown' || key === 'AudioVolumeDown'
    );
    const powerPressed = keysArray.find(([key]) => key === 'Power');
    
    if (volumeDownPressed && powerPressed) {
      const [, volumeTime] = volumeDownPressed;
      const [, powerTime] = powerPressed;
      
      // Both keys pressed within combo window
      if (Math.abs(volumeTime - powerTime) < config.hardwareComboWindow) {
        onViolation?.({ 
          type: 'mobile_hardware_combo', 
          timestamp: now,
          details: { 
            keys: Array.from(pressedKeys.keys()),
            timeDiff: Math.abs(volumeTime - powerTime)
          } 
        });
        
        // Clear the keys to prevent multiple triggers
        pressedKeys.clear();
        return true;
      }
    }
    
    // Check for Power + Volume Up combination (some Android devices)
    const volumeUpPressed = keysArray.find(([key]) => 
      key === 'VolumeUp' || key === 'AudioVolumeUp'
    );
    
    if (volumeUpPressed && powerPressed) {
      const [, volumeTime] = volumeUpPressed;
      const [, powerTime] = powerPressed;
      
      if (Math.abs(volumeTime - powerTime) < config.hardwareComboWindow) {
        onViolation?.({ 
          type: 'mobile_hardware_combo', 
          timestamp: now,
          details: { 
            keys: Array.from(pressedKeys.keys()),
            timeDiff: Math.abs(volumeTime - powerTime)
          } 
        });
        
        pressedKeys.clear();
        return true;
      }
    }
    
    return false;
  };

  // --- Event Handlers ---

  const handlePointerDown = (e: PointerEvent) => {
    activePointers.set(e.pointerId, e);
    swipeStartTimes.set(e.pointerId, Date.now());
    swipeStartPositions.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-Touch detection (3+ fingers)
    if (activePointers.size >= config.minMultiTouchCount) {
      onViolation?.({
        type: 'mobile_screenshot_gesture',
        timestamp: Date.now(),
        details: { pointerCount: activePointers.size }
      });
      
      // Clear pointers to prevent spam
      activePointers.clear();
      return;
    }

    // Palm Swipe detection
    if (detectPalmSwipe(e)) {
      onViolation?.({
        type: 'mobile_palm_gesture',
        timestamp: Date.now(),
        details: { 
          radiusX: (e as any).radiusX, 
          radiusY: (e as any).radiusY,
          pressure: e.pressure 
        }
      });
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, e);

    // Detect fast swipe
    if (detectSwipe(e.pointerId)) {
      swipeStartTimes.delete(e.pointerId);
      swipeStartPositions.delete(e.pointerId);
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    activePointers.delete(e.pointerId);
    swipeStartTimes.delete(e.pointerId);
    swipeStartPositions.delete(e.pointerId);
  };

  const handlePointerCancel = (e: PointerEvent) => {
    activePointers.delete(e.pointerId);
    swipeStartTimes.delete(e.pointerId);
    swipeStartPositions.delete(e.pointerId);
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    onViolation?.({ type: 'mobile_context_menu', timestamp: Date.now() });
  };

  const handleDragStart = (e: DragEvent) => {
    e.preventDefault();
    onViolation?.({ type: 'mobile_drag_start', timestamp: Date.now() });
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const now = Date.now();
    const key = e.key || e.code;
    
    // Track when the key was pressed
    if (!pressedKeys.has(key)) {
      pressedKeys.set(key, now);
    }
    
    // Enhanced Power Button Double-Click Detection
    if (key === 'Power' || e.code === 'Power') {
      const timeSinceLastClick = now - lastPowerClickTime;
      
      if (timeSinceLastClick < config.powerDoubleClickWindow) {
        // Double-click detected!
        powerClickCount++;
        
        if (powerClickCount >= 1) { // Second click
          onViolation?.({ 
            type: 'mobile_power_double_click', 
            timestamp: now,
            details: { 
              timeBetweenClicks: timeSinceLastClick,
              clickCount: powerClickCount + 1 
            }
          });
          
          // Reset
          powerClickCount = 0;
          lastPowerClickTime = 0;
          
          if (powerClickTimer) {
            clearTimeout(powerClickTimer);
            powerClickTimer = null;
          }
        }
      } else {
        // First click or timeout exceeded
        powerClickCount = 0;
        lastPowerClickTime = now;
        
        // Reset counter after window expires
        if (powerClickTimer) {
          clearTimeout(powerClickTimer);
        }
        powerClickTimer = setTimeout(() => {
          powerClickCount = 0;
          lastPowerClickTime = 0;
        }, config.powerDoubleClickWindow);
      }
    }
    
    // Enhanced Volume Button Detection
    if (key === 'VolumeDown' || e.code === 'VolumeDown' || key === 'AudioVolumeDown') {
      lastVolumeDownTime = now;
      
      onViolation?.({ 
        type: 'mobile_volume_down', 
        timestamp: now,
        details: { key }
      });
    }
    
    if (key === 'VolumeUp' || e.code === 'VolumeUp' || key === 'AudioVolumeUp') {
      lastVolumeUpTime = now;
      
      onViolation?.({ 
        type: 'mobile_volume_up', 
        timestamp: now,
        details: { key }
      });
    }
    
    // Check for hardware combo
    if (!isInComboWindow) {
      isInComboWindow = true;
      
      // Check combo after a short delay to allow both keys to register
      if (comboDetectionTimer) {
        clearTimeout(comboDetectionTimer);
      }
      
      comboDetectionTimer = setTimeout(() => {
        checkHardwareCombo();
        isInComboWindow = false;
      }, 100); // 100ms delay to catch both key presses
    } else {
      // Already in combo window, check immediately
      checkHardwareCombo();
    }
    
    // Detect single hardware button press (backup detection)
    if (
      key === 'VolumeUp' || 
      key === 'VolumeDown' || 
      key === 'Power' || 
      e.code === 'VolumeUp' || 
      e.code === 'VolumeDown' ||
      e.code === 'Power'
    ) {
      onViolation?.({ 
        type: 'mobile_hardware_button', 
        timestamp: now,
        details: { key, code: e.code }
      });
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key || e.code;
    pressedKeys.delete(key);
    
    // Clear combo detection if all keys released
    if (pressedKeys.size === 0) {
      if (comboDetectionTimer) {
        clearTimeout(comboDetectionTimer);
        comboDetectionTimer = null;
      }
      isInComboWindow = false;
    }
  };

  // Enhanced visibility change detection
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Page hidden - potential screenshot attempt
      onViolation?.({ 
        type: 'mobile_visibility_hidden', 
        timestamp: Date.now() 
      });
    }
  };

  // Detect task switcher (Android)
  const handleBlur = () => {
    if (isMobileDevice()) {
      onViolation?.({ 
        type: 'mobile_blur_event', 
        timestamp: Date.now() 
      });
    }
  };

  // Prevent context menu (long press)
  window.addEventListener('contextmenu', handleContextMenu, { capture: true });

  // Disable text selection and touch callout
  const originalUserSelect = document.documentElement.style.userSelect;
  const originalWebkitUserSelect = document.documentElement.style.webkitUserSelect;
  const originalWebkitTouchCallout = (document.documentElement.style as any).webkitTouchCallout;

  document.documentElement.style.userSelect = 'none';
  document.documentElement.style.webkitUserSelect = 'none';
  (document.documentElement.style as any).webkitTouchCallout = 'none';

  // Add CSS to prevent screenshot helpers
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    
    img, video, canvas {
      pointer-events: none;
      -webkit-user-drag: none;
      -khtml-user-drag: none;
      -moz-user-drag: none;
      -o-user-drag: none;
      user-drag: none;
    }
  `;
  document.head.appendChild(style);

  // Pointer Events Registration
  const options: AddEventListenerOptions = { capture: true, passive: false };
  window.addEventListener('pointerdown', handlePointerDown, options);
  window.addEventListener('pointermove', handlePointerMove, options);
  window.addEventListener('pointerup', handlePointerUp, options);
  window.addEventListener('pointercancel', handlePointerCancel, options);

  // Other event listeners
  window.addEventListener('dragstart', handleDragStart, { capture: true });
  window.addEventListener('keydown', handleKeyDown, { capture: true });
  window.addEventListener('keyup', handleKeyUp, { capture: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('blur', handleBlur);

  // Return cleanup function
  return () => {
    window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    window.removeEventListener('dragstart', handleDragStart, { capture: true });
    window.removeEventListener('keydown', handleKeyDown, { capture: true });
    window.removeEventListener('keyup', handleKeyUp, { capture: true });
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleBlur);

    window.removeEventListener('pointerdown', handlePointerDown, options);
    window.removeEventListener('pointermove', handlePointerMove, options);
    window.removeEventListener('pointerup', handlePointerUp, options);
    window.removeEventListener('pointercancel', handlePointerCancel, options);

    document.documentElement.style.userSelect = originalUserSelect;
    document.documentElement.style.webkitUserSelect = originalWebkitUserSelect;
    (document.documentElement.style as any).webkitTouchCallout = originalWebkitTouchCallout;
    
    if (style.parentNode) {
      style.parentNode.removeChild(style);
    }
    
    if (powerClickTimer) {
      clearTimeout(powerClickTimer);
    }
    
    if (comboDetectionTimer) {
      clearTimeout(comboDetectionTimer);
    }
    
    activePointers.clear();
    swipeStartTimes.clear();
    swipeStartPositions.clear();
    pressedKeys.clear();
  };
};