"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isMobileDevice } from '@/lib/security/mobileProtection';
import toast from 'react-hot-toast';

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
            PROPERTY OF ALFAJR • {user.name}
          </div>
          <div
            className="absolute text-white/8 font-bold text-xs whitespace-nowrap select-none pointer-events-none mix-blend-overlay"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }}
          >
            {user.email}
          </div>
        </div>
      )}
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
  const [isBuffering, setIsBuffering] = useState(true); // start true so spinner shows
  const [bufferPercent, setBufferPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = isMobileDevice();
  const optimizedSrc = optimizeFirebaseStorageUrl(src);

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
        // ── CRITICAL: crossOrigin enables Range requests + proper CORS ──
        crossOrigin="anonymous"
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
                stroke="#C5A059"
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
            className="h-full bg-[#C5A059]/40 transition-all duration-500"
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
            className="px-4 py-2 bg-[#C5A059] text-black text-sm font-bold rounded-lg hover:bg-[#D4AF6A] transition-colors"
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
            PROPERTY OF ALFAJR • {user.name}
          </div>
          <div
            className="absolute text-white/8 font-bold text-xs whitespace-nowrap mix-blend-overlay"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }}
          >
            {user.email}
          </div>
        </div>
      )}
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

  return (
    <NativeVideoPlayer
      src={src}
      onEnded={onEnded}
      onTimeUpdate={onTimeUpdate}
      watermark={watermark}
      disableSeeking={disableSeeking}
      user={user}
    />
  );
});

UniversalPlayer.displayName = 'UniversalPlayer';
export default UniversalPlayer;
