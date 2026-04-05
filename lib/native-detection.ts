// lib/native-detection.ts
import { Capacitor } from '@capacitor/core';

let _isNativeApp: boolean | null = null;

export function getIsNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // 1. Memory Cache
  if (_isNativeApp === true) return true;
  
  // 2. Window Flag (Set by layout script)
  if ((window as any).__isNativeApp === true) {
    _isNativeApp = true;
    return true;
  }

  // 3. LocalStorage Cache (Persistent detection)
  try {
    if (localStorage.getItem('alfajr_is_native') === 'true') {
      _isNativeApp = true;
      (window as any).__isNativeApp = true;
      return true;
    }
  } catch (e) {}

  // 4. Multiple UA & Object Detection
  const ua = navigator.userAgent;
  const uaLower = ua.toLowerCase();
  
  const isApp = 
    uaLower.includes('alfajrapp') || 
    uaLower.includes('capacitor') || 
    Capacitor.isNativePlatform() || 
    (window as any).Capacitor?.isNativePlatform?.() ||
    !!(window as any).Capacitor?.Plugins ||
    !!((window as any).WebKit && (window as any).WebKit.messageHandlers && (window as any).WebKit.messageHandlers.cordova);
  
  if (isApp) {
    console.log('Native detection successful via UA/Object');
    _isNativeApp = true;
    (window as any).__isNativeApp = true;
    try { localStorage.setItem('alfajr_is_native', 'true'); } catch (e) {}
    // Dispatch event for reactive components
    window.dispatchEvent(new Event('alfajr_native_detected'));
  }
  
  return isApp;
}
