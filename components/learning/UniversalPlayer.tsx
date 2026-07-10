"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { isMobileDevice } from '@/lib/security/mobileProtection';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

// ─── YouTube URL Parser ───────────────────────────────────────────────────────
function getYouTubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url?.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function buildYouTubeEmbedUrl(url: string): string | null {
  const id = getYouTubeId(url);
  if (!id) return null;
  // rel=0 → no related videos, modestbranding=1 → minimal branding
  // enablejsapi=1 → allow JS control, iv_load_policy=3 → no annotations
  return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&iv_load_policy=3&playsinline=1`;
}

// ─── Firebase Storage URL Optimizer ──────────────────────────────────────────
// Firebase Storage supports HTTP Range Requests — leverage this for streaming.
// We also add cache-busting avoidance and token refresh handling.
function optimizeFirebaseStorageUrl(url: string): string {
  if (!url) return url;
  // Already optimized or not a Firebase Storage URL
  if (!url.includes('firebasestorage.googleapis.com')) return url;
  
  try {
    const parsed = new URL(url);
    // Remove unnecessary params that cause cache misses
    // Keep: alt=media, token
    // Remove: nothing — just ensure alt=media is present for direct download
    if (!parsed.searchParams.has('alt')) {
      parsed.searchParams.set('alt', 'media');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

interface UniversalPlayerProps {
  src: string;
  contentType: 'youtube' | 'video-upload';
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  watermark?: boolean;
  disableSeeking?: boolean;
}

// ─── Fullscreen Portal Watermark ──────────────────────────────────────────
const FullscreenWatermark: React.FC<{ user: any }> = ({ user }) => {
  const [fullscreenElement, setFullscreenElement] = useState<Element | null>(null);

  useEffect(() => {
    const handleFsChange = () => {
      setFullscreenElement(document.fullscreenElement || (document as any).webkitFullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  if (!fullscreenElement || !user) return null;

  // We portal the watermark into the fullscreen element (if it's not the video tag, 
  // as video tags can't have children. But if it's the div, it works).
  // If it's the video tag, we can't easily show overlays on top in some browsers.
  return ReactDOM.createPortal(
    <div className="absolute inset-0 pointer-events-none z-[9999] overflow-hidden select-none touch-none">
       <div
        className="absolute text-white/10 font-bold text-sm whitespace-nowrap mix-blend-overlay"
        style={{ top: '15%', left: '10%', transform: 'rotate(-15deg)' }}
      >
        {user.email}
      </div>
      <div
        className="absolute text-white/8 font-bold text-xs whitespace-nowrap mix-blend-overlay"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }}
      >
        {user.email}
      </div>
      <div
        className="absolute text-white/5 font-bold text-[10px] whitespace-nowrap mix-blend-overlay"
        style={{ bottom: '15%', right: '10%', transform: 'rotate(-10deg)' }}
      >
        PROPERTY OF INTERNASIONAL KOMPUTER • {user.name}
      </div>
    </div>,
    fullscreenElement
  );
};

// ─── Desktop In-Player Screenshot Violation Overlay ───────────────────────
// This overlay renders INSIDE the video container div, ensuring it works
// even when the video is in fullscreen mode. It listens for the custom
// 'alfajr-screenshot-violation' event dispatched by useScreenProtection.
const DesktopViolationOverlay: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isMobile = isMobileDevice();

  useEffect(() => {
    // Only on desktop
    if (isMobile) return;

    const handleViolation = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const seconds = detail?.countdown || 10;

      // Activate overlay
      setIsActive(true);
      setCountdown(seconds);

      // Clear any existing countdown
      if (countdownRef.current) clearInterval(countdownRef.current);

      let timeLeft = seconds;
      countdownRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          countdownRef.current = null;
          setIsActive(false);
        }
      }, 1000);
    };

    window.addEventListener('alfajr-screenshot-violation', handleViolation);
    return () => {
      window.removeEventListener('alfajr-screenshot-violation', handleViolation);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isMobile]);

  useEffect(() => {
    if (isActive && dialogRef.current && !dialogRef.current.open) {
      dialogRef.current.showModal();
    } else if (!isActive && dialogRef.current && dialogRef.current.open) {
      dialogRef.current.close();
    }
  }, [isActive]);

  return (
    <dialog
      ref={dialogRef}
      className={`m-0 p-0 w-screen h-screen max-w-none max-h-none border-none bg-black flex-col items-center justify-center text-white select-none backdrop:bg-black backdrop-blur-3xl ${isActive ? 'flex' : 'hidden'}`}
      style={{ zIndex: 2147483647 }}
      onCancel={(e) => e.preventDefault()} // prevent dismissing with Escape
    >
      {/* Top Warning Banner */}
      <div 
        className="absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2 rounded-xl flex items-center gap-2.5 font-bold text-sm select-none"
        style={{
          background: '#DC2626',
          boxShadow: '0 0 25px rgba(220, 38, 38, 0.6)',
          animation: 'alfajr-bounce-short 2s ease-in-out infinite',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>⚠️ Screenshot tidak diperbolehkan!</span>
      </div>

      {/* Center Content */}
      <div className="flex flex-col items-center text-center px-4">
        {/* Shield Icon */}
        <svg 
          width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginBottom: '20px', filter: 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.4))' }}
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>

        <h2 
          className="font-bold tracking-tight uppercase text-white select-none"
          style={{ fontSize: 'clamp(18px, 4vw, 30px)', marginBottom: '8px' }}
        >
          KEAMANAN TERDETEKSI
        </h2>

        <p 
          className="text-gray-400 select-none"
          style={{ fontSize: 'clamp(12px, 2vw, 16px)', marginBottom: '28px', maxWidth: '400px' }}
        >
          Percobaan screenshot atau rekam layar terdeteksi. Konten telah diamankan.
        </p>

        {/* Countdown Circle */}
        <div className="relative flex items-center justify-center">
          <div 
            className="rounded-full flex items-center justify-center"
            style={{
              width: 'clamp(64px, 12vw, 96px)',
              height: 'clamp(64px, 12vw, 96px)',
              border: '3px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            {/* Spinning border */}
            <div
              className="absolute rounded-full"
              style={{
                inset: 0,
                border: '3px solid #EF4444',
                borderTopColor: 'transparent',
                animation: 'alfajr-spin-slow 2s linear infinite',
                borderRadius: '9999px',
              }}
            />
            <span 
              className="font-bold text-white select-none"
              style={{ fontSize: 'clamp(24px, 5vw, 40px)' }}
            >
              {countdown > 0 ? countdown : '!'}
            </span>
          </div>
        </div>
      </div>

      {/* Inline keyframes for fullscreen isolation */}
      <style>{`
        @keyframes alfajr-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes alfajr-bounce-short {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-5px); }
        }
      `}</style>
    </dialog>
  );
};

// ─── YouTube Iframe Player ────────────────────────────────────────────────────
const YouTubePlayer: React.FC<{
  src: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  watermark?: boolean;
  user: any;
}> = ({ src, watermark, user }) => {
  const embedUrl = buildYouTubeEmbedUrl(src);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (!embedUrl) {
    return (
      <div className="w-full aspect-video bg-black flex items-center justify-center rounded-2xl">
        <p className="text-white/60 text-sm">URL YouTube tidak valid</p>
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-video select-none rounded-2xl overflow-hidden shadow-lg bg-black"
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        loading="lazy"
        title="Video pembelajaran"
      />
      {/* Watermark overlay */}
      {watermark && user && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none">
          <div
            className="absolute text-white/10 font-bold text-sm whitespace-nowrap select-none pointer-events-none mix-blend-overlay"
            style={{ top: '12%', left: '8%', transform: 'rotate(-15deg)' }}
          >
            {user.email}
          </div>
          <div
            className="absolute text-white/5 font-bold text-[10px] whitespace-nowrap select-none pointer-events-none mix-blend-overlay"
            style={{ bottom: '20%', right: '10%', transform: 'rotate(-10deg)' }}
          >
            PROPERTY OF INTERNASIONAL KOMPUTER • {user.name}
          </div>
          <div
            className="absolute text-white/8 font-bold text-xs whitespace-nowrap select-none pointer-events-none mix-blend-overlay"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }}
          >
            {user.email}
          </div>
        </div>
      )}

      {/* ── Desktop Screenshot Violation Overlay (works in fullscreen too) ── */}
      <DesktopViolationOverlay />
    </div>
  );
};

// ─── Native HTML5 Video Player (Firebase Storage Optimized) ──────────────────
const NativeVideoPlayer: React.FC<{
  src: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  watermark?: boolean;
  disableSeeking?: boolean;
  user: any;
}> = ({ src, onEnded, onTimeUpdate, watermark, disableSeeking, user }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxTimeReachedRef = useRef(0);
  const [isBuffering, setIsBuffering] = useState(false); // Initialize as false to show play controls on mobile immediately
  const [bufferPercent, setBufferPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [useProxy, setUseProxy] = useState(false);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = isMobileDevice();
  
  // Use proxy if direct access fails (CORS/Network issues)
  const optimizedSrc = useProxy 
    ? `/api/video/stream?url=${encodeURIComponent(src)}`
    : optimizeFirebaseStorageUrl(src);

  // ─── Preconnect to Firebase Storage (warm TCP) ───────────────────────────
  useEffect(() => {
    if (!src.includes('firebasestorage.googleapis.com')) return;
    // Inject preconnect link tags if not already present
    const hosts = [
      'https://firebasestorage.googleapis.com',
      'https://storage.googleapis.com',
    ];
    hosts.forEach((href) => {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = href;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }, [src]);

  const clearStallTimer = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const handleRetry = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    clearStallTimer();

    const currentTime = video.currentTime;
    // Force reload by resetting src
    video.pause();
    video.removeAttribute('src');
    video.load();
    // Small delay before re-assigning
    setTimeout(() => {
      video.src = optimizedSrc;
      video.load();
      video.currentTime = currentTime;
      video.play().catch(() => {});
    }, 800);
  }, [optimizedSrc, clearStallTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // ── CRITICAL MOBILE OPTIMIZATIONS ──────────────────────────────────────
    // 1. preload="auto" tells browser to start buffering immediately
    video.preload = 'auto';
    // 2. playsinline prevents fullscreen on iOS
    video.playsInline = true;
    // 3. Disable picture-in-picture (security)
    (video as any).disablePictureInPicture = true;

    // ── HTTP Range Request hint via fetch (warms the connection) ───────────
    // Fire a small HEAD request so the browser opens a connection to Firebase
    // Storage before the user presses play. This eliminates DNS+TLS handshake
    // latency from the critical path.
    if (src.includes('firebasestorage.googleapis.com')) {
      fetch(optimizedSrc, {
        method: 'GET',
        headers: { Range: 'bytes=0-65535' }, // Fetch first 64 KB
        mode: 'cors',
        cache: 'force-cache',
      }).catch(() => {}); // Fire and forget
    }

    const onPlay = () => {
      setIsBuffering(true);
    };

    const onPause = () => {
      setIsBuffering(false);
    };

    const onSeeking = () => {
      setIsBuffering(true);
    };

    const onSeeked = () => {
      setIsBuffering(false);
    };

    const onWaiting = () => {
      setIsBuffering(true);
      // If stalled for too long on mobile, retry
      clearStallTimer();
      stallTimerRef.current = setTimeout(() => {
        if (retryCount < 3) {
          setRetryCount((c) => c + 1);
          handleRetry();
        }
      }, isMobile ? 6000 : 12000);
    };

    const onCanPlay = () => {
      setIsBuffering(false);
      setError(null);
      clearStallTimer();
    };

    const onPlaying = () => {
      setIsBuffering(false);
      setError(null);
      clearStallTimer();
    };

    const onStalled = () => {
      // Stalled = browser stopped fetching data
      if (!video.paused) {
        clearStallTimer();
        stallTimerRef.current = setTimeout(handleRetry, isMobile ? 4000 : 8000);
      }
    };

    const onProgress = () => {
      if (!video.duration || !video.buffered.length) return;
      const end = video.buffered.end(video.buffered.length - 1);
      setBufferPercent(Math.round((end / video.duration) * 100));
    };

    const onVideoTimeUpdate = () => {
      const current = video.currentTime;
      const duration = video.duration || 0;

      if (disableSeeking) {
        if (current > maxTimeReachedRef.current + 2) {
          video.currentTime = maxTimeReachedRef.current;
          return;
        }
        if (current > maxTimeReachedRef.current) {
          maxTimeReachedRef.current = current;
        }
      }
      onTimeUpdate?.(current, duration);
    };

    const onVideoEnded = () => {
      clearStallTimer();
      onEnded?.();
    };

    const onError = () => {
      const code = video.error?.code;
      clearStallTimer();

      // If direct access fails and we haven't tried proxy yet, try proxy
      if (!useProxy && src.includes('firebasestorage.googleapis.com')) {
        console.warn('[VIDEO PLAYER] Direct access failed, trying proxy fallback...');
        setUseProxy(true);
        setRetryCount(0);
        return;
      }

      if (code === 2 || code === 3) {
        // Network or decode error — retry
        if (retryCount < 3) {
          setRetryCount((c) => c + 1);
          handleRetry();
        } else {
          setError('Gagal memuat video. Periksa koneksi internet Anda.');
        }
      } else if (code === 4) {
        setError('Format video tidak didukung oleh perangkat ini.');
      }
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('canplaythrough', onCanPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('stalled', onStalled);
    video.addEventListener('progress', onProgress);
    video.addEventListener('timeupdate', onVideoTimeUpdate);
    video.addEventListener('ended', onVideoEnded);
    video.addEventListener('error', onError);
    video.addEventListener('contextmenu', onContextMenu);

    return () => {
      clearStallTimer();
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('canplaythrough', onCanPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('stalled', onStalled);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('timeupdate', onVideoTimeUpdate);
      video.removeEventListener('ended', onVideoEnded);
      video.removeEventListener('error', onError);
      video.removeEventListener('contextmenu', onContextMenu);
    };
  }, [optimizedSrc, disableSeeking, isMobile, retryCount, handleRetry, clearStallTimer, onEnded, onTimeUpdate, src]);

  return (
    <div
      className="relative w-full aspect-video select-none rounded-2xl overflow-hidden shadow-lg bg-black"
      onContextMenu={(e) => {
        e.preventDefault();
        toast.error('Klik kanan dinonaktifkan untuk keamanan.');
      }}
    >
      {/* ── Native Video Element ── */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        src={optimizedSrc}
        preload="auto"
        playsInline
        controls
        controlsList="nodownload noremoteplayback"
        // ── crossOrigin is only set for Firebase Storage to prevent CORS issues on other CDNs like Bunny ──
        crossOrigin={src.includes('firebasestorage.googleapis.com') ? 'anonymous' : undefined}
        style={{ background: '#000' }}
      />

      {/* ── Buffering Spinner ── */}
      {isBuffering && !error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 pointer-events-none">
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 animate-spin" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
              <circle
                cx="28" cy="28" r="24"
                stroke="#0284c7"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="100 50"
              />
            </svg>
          </div>
          {bufferPercent > 0 && bufferPercent < 100 && (
            <p className="mt-3 text-white/80 text-xs font-semibold tracking-wide">
              Buffering {bufferPercent}%
            </p>
          )}
          {bufferPercent === 0 && (
            <p className="mt-3 text-white/60 text-[11px]">Menghubungkan...</p>
          )}
        </div>
      )}

      {/* ── Buffer Progress Bar ── */}
      {!isBuffering && bufferPercent > 0 && bufferPercent < 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 z-10 pointer-events-none">
          <div
            className="h-full bg-[#0284c7]/40 transition-all duration-500"
            style={{ width: `${bufferPercent}%` }}
          />
        </div>
      )}

      {/* ── Error State ── */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
          <svg className="w-12 h-12 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium text-red-300 mb-3">{error}</p>
          <button
            onClick={() => { setError(null); setRetryCount(0); handleRetry(); }}
            className="px-4 py-2 bg-[#0284c7] text-white text-sm font-bold rounded-lg hover:bg-[#D4AF6A] transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* ── Watermark ── */}
      {watermark && user && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none touch-none">
          <div
            className="absolute text-white/10 font-bold text-sm whitespace-nowrap mix-blend-overlay"
            style={{ top: '12%', left: '8%', transform: 'rotate(-15deg)' }}
          >
            {user.email}
          </div>
          <div
            className="absolute text-white/5 font-bold text-[10px] whitespace-nowrap mix-blend-overlay"
            style={{ bottom: '20%', right: '10%', transform: 'rotate(-10deg)' }}
          >
            PROPERTY OF INTERNASIONAL KOMPUTER • {user.name}
          </div>
          <div
            className="absolute text-white/8 font-bold text-xs whitespace-nowrap mix-blend-overlay"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }}
          >
            {user.email}
          </div>
        </div>
      )}

      {/* ── Desktop Screenshot Violation Overlay (works in fullscreen too) ── */}
      <DesktopViolationOverlay />
    </div>
  );
};

// ─── Bunny Stream DRM HTML5 Iframe Player (Adaptive Bitrate DRM Protected) ───
const BunnyStreamPlayer: React.FC<{
  src: string;
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  watermark?: boolean;
  user: any;
}> = ({ src, onEnded, onTimeUpdate, watermark, user }) => {
  const { authFetch } = useAuth();
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmbedUrl = async () => {
      try {
        setLoading(true);
        setError(null);

        // Parse: bunny-stream://{libraryId}/{videoId}
        const cleanPath = src.replace('bunny-stream://', '');
        const parts = cleanPath.split('/');
        if (parts.length < 2) {
          throw new Error('Format URL Bunny Stream tidak valid.');
        }
        const videoId = parts[1];

        // Fetch secure embed url
        const res = await authFetch(`/api/video/embed-url?videoId=${videoId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Gagal memuat player video aman.');
        }
        const data = await res.json();
        setEmbedUrl(data.embedUrl);
      } catch (err: any) {
        console.error('Error fetching embed URL:', err);
        setError(err.message || 'Gagal menyiapkan pemutar video.');
      } finally {
        setLoading(false);
      }
    };

    if (src) {
      fetchEmbedUrl();
    }
  }, [src, authFetch]);

  // Listen to Bunny Stream Player iframe postMessage events for progress/ended tracking
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin to ensure it's from Bunny Stream embed domain
      if (!event.origin.includes('mediadelivery.net')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Handle player.js events
        if (data.event === 'ended' && onEnded) {
          onEnded();
        } else if (data.event === 'timeupdate' && onTimeUpdate && data.value) {
          // Bunny stream player.js format for timeupdate: data.value is { seconds, duration } or similar
          const currentTime = data.value.seconds || 0;
          const duration = data.value.duration || 0;
          onTimeUpdate(currentTime, duration);
        }
      } catch (e) {
        // Ignored
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onEnded, onTimeUpdate]);

  return (
    <div
      className="relative w-full aspect-video select-none rounded-2xl overflow-hidden shadow-lg bg-black"
      onContextMenu={(e) => {
        e.preventDefault();
        toast.error('Klik kanan dinonaktifkan untuk keamanan.');
      }}
    >
      {loading ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black">
          <Loader2 className="animate-spin text-[#0284c7] mb-2" size={32} />
          <p className="text-white/60 text-xs">Menghubungkan video aman...</p>
        </div>
      ) : error ? (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black p-4 text-center">
          <svg className="w-12 h-12 text-red-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm font-medium text-red-300 mb-3">{error}</p>
        </div>
      ) : (
        <iframe
          src={embedUrl}
          loading="lazy"
          style={{ border: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen={true}
        />
      )}

      {/* ── Watermark ── */}
      {watermark && user && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none touch-none">
          <div
            className="absolute text-white/10 font-bold text-sm whitespace-nowrap mix-blend-overlay"
            style={{ top: '12%', left: '8%', transform: 'rotate(-15deg)' }}
          >
            {user.email}
          </div>
          <div
            className="absolute text-white/5 font-bold text-[10px] whitespace-nowrap mix-blend-overlay"
            style={{ bottom: '20%', right: '10%', transform: 'rotate(-10deg)' }}
          >
            PROPERTY OF INTERNASIONAL KOMPUTER • {user.name}
          </div>
          <div
            className="absolute text-white/8 font-bold text-xs whitespace-nowrap mix-blend-overlay"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }}
          >
            {user.email}
          </div>
        </div>
      )}

      {/* ── Desktop Screenshot Violation Overlay (works in fullscreen too) ── */}
      <DesktopViolationOverlay />
    </div>
  );
};

// ─── Main UniversalPlayer ─────────────────────────────────────────────────────
const UniversalPlayer = React.forwardRef<any, UniversalPlayerProps>(({
  src,
  contentType,
  onEnded,
  onTimeUpdate,
  watermark = true,
  disableSeeking = false,
}, _ref) => {
  const { user } = useAuth();

  if (contentType === 'youtube') {
    return (
      <YouTubePlayer
        src={src}
        onEnded={onEnded}
        onTimeUpdate={onTimeUpdate}
        watermark={watermark}
        user={user}
      />
    );
  }

  // Handle Bunny Stream DRM-protected streaming
  if (src?.startsWith('bunny-stream://')) {
    return (
      <>
        {watermark && <FullscreenWatermark user={user} />}
        <BunnyStreamPlayer
          src={src}
          onEnded={onEnded}
          onTimeUpdate={onTimeUpdate}
          watermark={watermark}
          user={user}
        />
      </>
    );
  }

  return (
    <>
      {watermark && <FullscreenWatermark user={user} />}
      <NativeVideoPlayer
        src={src}
        onEnded={onEnded}
        onTimeUpdate={onTimeUpdate}
        watermark={watermark}
        disableSeeking={disableSeeking}
        user={user}
      />
    </>
  );
});

UniversalPlayer.displayName = 'UniversalPlayer';
export default UniversalPlayer;
