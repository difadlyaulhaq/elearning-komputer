"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { useAuth } from '@/context/AuthContext';
import { isMobileDevice } from '@/lib/security/mobileProtection';
import toast from 'react-hot-toast';

interface UniversalPlayerProps {
  src: string;
  contentType: 'youtube' | 'video-upload';
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  watermark?: boolean;
  disableSeeking?: boolean;
}

const UniversalPlayer = React.forwardRef<any, UniversalPlayerProps>(({
  src,
  contentType,
  onEnded,
  onTimeUpdate,
  watermark = true,
  disableSeeking = false
}, ref) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const maxTimeReachedRef = useRef(0);
  const retryCountRef = useRef(0);
  const stalledTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);

  // Clear all recovery timers
  const clearAllTimers = useCallback(() => {
    if (stalledTimerRef.current) {
      clearTimeout(stalledTimerRef.current);
      stalledTimerRef.current = null;
    }
    if (recoveryTimerRef.current) {
      clearTimeout(recoveryTimerRef.current);
      recoveryTimerRef.current = null;
    }
  }, []);

  // Recovery function with exponential backoff
  const attemptRecovery = useCallback((player: any, sources: any[]) => {
    if (!player || player.isDisposed()) return;

    retryCountRef.current++;
    const backoff = Math.min(1000 * Math.pow(1.5, retryCountRef.current - 1), 8000);

    console.log(`[UniversalPlayer] Recovery attempt #${retryCountRef.current}, backoff: ${backoff}ms`);

    recoveryTimerRef.current = setTimeout(() => {
      if (!player || player.isDisposed()) return;

      try {
        const currentTime = player.currentTime() || 0;

        // Strategy 1: If first 2 attempts, just try to play from current position
        if (retryCountRef.current <= 2) {
          player.pause();
          player.currentTime(currentTime);
          player.load();
          const playPromise = player.play();
          if (playPromise) playPromise.catch(() => {});
        }
        // Strategy 2: Reload the source entirely
        else if (retryCountRef.current <= 4) {
          player.src(sources);
          player.one('loadedmetadata', () => {
            if (currentTime > 0) {
              player.currentTime(currentTime);
            }
            player.play()?.catch(() => {});
          });
          player.load();
        }
        // Strategy 3: Full re-init after max retries
        else {
          console.log('[UniversalPlayer] Max retries reached, full re-init');
          retryCountRef.current = 0;
          player.src(sources);
          player.load();
          player.play()?.catch(() => {});
        }
      } catch (err) {
        console.error('[UniversalPlayer] Recovery error:', err);
      }
    }, backoff);
  }, []);

  // Function to initialize the player
  const initPlayer = () => {
    if (!videoRef.current) return;

    // Remove any existing video element to start fresh
    videoRef.current.innerHTML = '';
    const videoEl = document.createElement('video');
    videoEl.className = 'video-js vjs-alfajr vjs-big-play-centered';
    videoEl.setAttribute('playsinline', 'true');
    videoEl.setAttribute('webkit-playsinline', 'true');
    videoRef.current.appendChild(videoEl);

    const isMobile = isMobileDevice();
    const isHls = src.includes('.m3u8');
    const sources =
      contentType === 'youtube'
        ? [{ src, type: 'video/youtube' }]
        : [{ src, type: isHls ? 'application/x-mpegURL' : 'video/mp4' }];

    // ─── ULTIMATE MOBILE OPTIMIZATION ───
    // On mobile, we need aggressive buffer settings to minimize buffering time.
    // Firebase Storage supports Range requests, so we leverage that.
    const player = videojs(videoEl, {
      controls: true,
      autoplay: false,
      // CRITICAL: Use 'auto' preload on mobile too — 'metadata' causes the
      // long initial buffering because Video.js waits for data before playing.
      // 'auto' tells the browser to start downloading immediately.
      preload: 'auto',
      fluid: true,
      responsive: true,
      playsinline: true,
      aspectRatio: '16:9',
      html5: {
        vhs: {
          // On mobile, let the native player handle HLS if available
          overrideNative: !isMobile,
          // Start with the lowest quality playlist for fast initial load
          enableLowInitialPlaylist: isMobile,
          // Enable fast quality switching without re-buffering
          fastQualityChange: true,
          // ─── AGGRESSIVE MOBILE BUFFER SETTINGS ───
          // goalBufferLength: How many seconds ahead to buffer
          goalBufferLength: isMobile ? 10 : 30,
          // maxBufferLength: Maximum buffer size in seconds
          maxBufferLength: isMobile ? 30 : 60,
          // handlePartialData: Process data as it arrives
          handlePartialData: true,
          // Lower bandwidth estimation for faster initial switch
          bandwidth: isMobile ? 500000 : undefined, // 500kbps initial estimate for mobile
        },
        nativeAudioTracks: isMobile,
        nativeVideoTracks: isMobile,
        // ─── CRITICAL: Native HLS support on mobile ───
        // This ensures mobile Safari and Android Chrome use native HLS
        // which is far more optimized than JavaScript-based HLS
        nativeTextTracks: isMobile,
      },
      sources,
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'remainingTimeDisplay',
          'fullscreenToggle',
        ],
      },
      retryOnError: true,
      // ─── Faster loading behavior ───
      liveui: false,
      enableSourceset: true,
    }, () => {
      // Player ready
      if (ref) {
        if (typeof ref === 'function') ref(player);
        else (ref as React.MutableRefObject<any>).current = player;
      }

      // ─── MOBILE: Force preload the video data on ready ───
      if (isMobile && contentType !== 'youtube') {
        const tech = player.tech({ IWillNotUseThisInPlugins: true });
        if (tech && tech.el()) {
          const videoElement = tech.el() as HTMLVideoElement;
          // Force the browser to start buffering immediately
          videoElement.preload = 'auto';
          // Request initial data load
          videoElement.load();
        }
      }
    });

    playerRef.current = player;
    retryCountRef.current = 0;

    // ─── BUFFERING STATE TRACKING ───
    player.on('waiting', () => {
      console.log('[UniversalPlayer] Buffering started...');
      setIsBuffering(true);

      // If stalled for too long, attempt recovery
      clearAllTimers();
      stalledTimerRef.current = setTimeout(() => {
        console.log('[UniversalPlayer] Stalled for too long, attempting recovery...');
        attemptRecovery(player, sources);
      }, isMobile ? 8000 : 15000); // 8s on mobile, 15s on desktop
    });

    player.on('playing', () => {
      console.log('[UniversalPlayer] Playing, resetting recovery state');
      setIsBuffering(false);
      retryCountRef.current = 0;
      clearAllTimers();
    });

    player.on('canplay', () => {
      setIsBuffering(false);
      clearAllTimers();
    });

    player.on('canplaythrough', () => {
      setIsBuffering(false);
      clearAllTimers();
    });

    // ─── STALLED EVENT: Video stopped receiving data ───
    player.on('stalled', () => {
      console.log('[UniversalPlayer] Download stalled');
      // Only recover if we're supposed to be playing
      if (!player.paused()) {
        stalledTimerRef.current = setTimeout(() => {
          attemptRecovery(player, sources);
        }, isMobile ? 5000 : 10000);
      }
    });

    // ─── BUFFER PROGRESS TRACKING ───
    player.on('progress', () => {
      try {
        const buffered = player.buffered();
        const duration = player.duration() ?? 0;
        if (buffered && buffered.length > 0 && duration > 0) {
          const end = buffered.end(buffered.length - 1);
          setBufferProgress(Math.round((end / duration) * 100));
        }
      } catch (e) {}
    });

    // ─── ERROR HANDLING with smart recovery ───
    player.on('error', () => {
      const error = player.error();
      if (error) {
        console.error(`[UniversalPlayer] Error code ${error.code}: ${error.message}`);

        // Network error (code 2) or media error (code 3) or source not found (code 4)
        if (error.code === 2 || error.code === 3 || error.code === 4) {
          // Clear the error state so Video.js doesn't block recovery
          player.error(undefined as any);
          attemptRecovery(player, sources);
        }
      }
    });

    // ─── MOBILE-SPECIFIC: Handle mobile network changes ───
    if (isMobile && typeof window !== 'undefined') {
      const handleOnline = () => {
        console.log('[UniversalPlayer] Network reconnected, recovering...');
        if (player && !player.isDisposed() && !player.paused()) {
          const currentTime = player.currentTime() || 0;
          player.src(sources);
          player.one('loadedmetadata', () => {
            if (currentTime > 0) player.currentTime(currentTime);
            player.play()?.catch(() => {});
          });
          player.load();
        }
      };

      window.addEventListener('online', handleOnline);
      // Store for cleanup
      (player as any).__handleOnline = handleOnline;
    }

    // ─── MOBILE-SPECIFIC: Touch to play optimization ───
    // On mobile, the first play is usually gated by a user gesture.
    // We pre-warm the video element to minimize the delay.
    if (isMobile && contentType !== 'youtube') {
      player.one('play', () => {
        // Once user initiates play, ensure we're loading aggressively
        try {
          const tech = player.tech({ IWillNotUseThisInPlugins: true });
          if (tech && tech.el()) {
            const videoElement = tech.el() as HTMLVideoElement;
            videoElement.preload = 'auto';
          }
        } catch (e) {}
      });
    }

    player.on('ended', () => { if (onEnded) onEnded(); });

    player.on('timeupdate', () => {
      const current = player.currentTime() ?? 0;
      const duration = player.duration() ?? 0;

      if (disableSeeking) {
        if (current > maxTimeReachedRef.current + 2) {
          player.currentTime(maxTimeReachedRef.current);
        } else if (current > maxTimeReachedRef.current) {
          maxTimeReachedRef.current = current;
        }
      }

      if (onTimeUpdate) onTimeUpdate(current, duration);
    });

    // Disable right-click on video
    player.on('loadedmetadata', () => {
      try {
        const vid = player.tech().el();
        if (vid) vid.addEventListener('contextmenu', (e: Event) => e.preventDefault());
      } catch (e) {}
    });
  };

  useEffect(() => {
    initPlayer();

    return () => {
      clearAllTimers();

      if (playerRef.current && !playerRef.current.isDisposed()) {
        // Clean up online listener
        if ((playerRef.current as any).__handleOnline) {
          window.removeEventListener('online', (playerRef.current as any).__handleOnline);
        }
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, contentType]); // Re-init if src or type changes

  return (
    <div
      className="relative w-full aspect-video select-none rounded-2xl overflow-hidden shadow-lg bg-black"
      onContextMenu={(e) => {
        e.preventDefault();
        toast.error("Klik kanan dinonaktifkan untuk keamanan.");
      }}
    >
      <style jsx global>{`
        /* ── Base ── */
        .vjs-alfajr.video-js {
          width: 100% !important;
          height: 100% !important;
          font-family: inherit;
          background: #000;
        }

        /* ── Control bar: putih abu-abu terang ── */
        .vjs-alfajr .vjs-control-bar {
          background: #f0f0f0 !important;
          border-top: 1px solid #ddd;
          height: 44px;
          display: flex;
          align-items: center;
          padding: 0 6px;
        }

        /* ── Semua icon: HITAM ── */
        .vjs-alfajr .vjs-control-bar .vjs-button > .vjs-icon-placeholder::before,
        .vjs-alfajr .vjs-control-bar .vjs-icon-placeholder::before {
          color: #111 !important;
          font-size: 20px;
          line-height: 44px;
        }

        /* Play/pause */
        .vjs-alfajr .vjs-play-control .vjs-icon-placeholder::before {
          color: #111 !important;
          font-size: 22px;
        }

        /* Volume/mute */
        .vjs-alfajr .vjs-mute-control .vjs-icon-placeholder::before,
        .vjs-alfajr .vjs-volume-panel .vjs-mute-control .vjs-icon-placeholder::before {
          color: #111 !important;
          font-size: 20px;
        }

        /* Fullscreen */
        .vjs-alfajr .vjs-fullscreen-control .vjs-icon-placeholder::before {
          color: #111 !important;
          font-size: 20px;
        }

        /* ── Teks waktu ── */
        .vjs-alfajr .vjs-current-time,
        .vjs-alfajr .vjs-duration,
        .vjs-alfajr .vjs-remaining-time,
        .vjs-alfajr .vjs-time-divider {
          color: #111 !important;
          font-size: 12px;
          font-weight: 600;
          line-height: 44px;
          padding: 0 3px;
          display: flex;
          align-items: center;
        }

        /* ── Progress bar ── */
        .vjs-alfajr .vjs-progress-control {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: center;
          cursor: pointer;
        }

        .vjs-alfajr .vjs-progress-holder {
          height: 5px;
          background: rgba(0,0,0,0.2) !important;
          border-radius: 3px;
          margin: 0 4px;
        }

        .vjs-alfajr .vjs-load-progress {
          background: rgba(0,0,0,0.2) !important;
          border-radius: 3px;
        }

        .vjs-alfajr .vjs-load-progress div {
          background: rgba(0,0,0,0.15) !important;
        }

        /* Fill gold */
        .vjs-alfajr .vjs-play-progress {
          background: #C5A059 !important;
          border-radius: 3px;
        }

        .vjs-alfajr .vjs-play-progress::before {
          color: #C5A059 !important;
          font-size: 13px;
          top: -4px;
        }

        /* Tooltip waktu */
        .vjs-alfajr .vjs-time-tooltip {
          background: rgba(20,20,20,0.85) !important;
          color: #fff !important;
          font-size: 11px;
          font-weight: 500;
          border-radius: 5px;
          padding: 3px 7px;
        }

        /* ── Volume slider ── */
        .vjs-alfajr .vjs-volume-bar {
          background: rgba(0,0,0,0.18) !important;
          border-radius: 3px;
        }

        .vjs-alfajr .vjs-volume-level {
          background: #C5A059 !important;
          border-radius: 3px;
        }

        .vjs-alfajr .vjs-volume-level::before {
          color: #C5A059 !important;
        }

        /* ── Hover button ── */
        .vjs-alfajr .vjs-control-bar .vjs-button:hover {
          background: rgba(0,0,0,0.08) !important;
          border-radius: 6px;
        }

        /* ── Big play button — frosted white, bulat ── */
        .vjs-alfajr .vjs-big-play-button {
          background: rgba(255,255,255,0.95) !important;
          border: none !important;
          border-radius: 50% !important;
          width: 64px !important;
          height: 64px !important;
          line-height: 64px !important;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          margin: 0 !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
          transition: all 0.22s ease;
        }

        .vjs-alfajr .vjs-big-play-button:hover {
          background: rgba(255,255,255,0.97) !important;
          transform: translate(-50%, -50%) scale(1.08) !important;
          box-shadow: 0 6px 32px rgba(0,0,0,0.28);
        }

        /* Icon play di tengah — hitam */
        .vjs-alfajr .vjs-big-play-button .vjs-icon-placeholder::before {
          color: #111 !important;
          font-size: 28px;
          line-height: 64px;
        }

        /* ── HIDE default spinner — we use our own ── */
        .vjs-alfajr .vjs-loading-spinner {
          display: none !important;
        }

        /* ── No outline ── */
        .vjs-alfajr:focus,
        .vjs-alfajr *:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <div ref={videoRef} className="w-full h-full" />

      {/* ── Custom Buffering Overlay ── */}
      {isBuffering && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 pointer-events-none">
          {/* Animated spinner ring */}
          <div className="relative w-14 h-14">
            <svg className="w-14 h-14 animate-spin" viewBox="0 0 56 56" fill="none">
              <circle
                cx="28" cy="28" r="24"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="4"
              />
              <circle
                cx="28" cy="28" r="24"
                stroke="#C5A059"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="100 50"
              />
            </svg>
          </div>
          {/* Buffer percentage */}
          {bufferProgress > 0 && bufferProgress < 100 && (
            <p className="mt-3 text-white/80 text-xs font-semibold tracking-wide">
              Memuat {bufferProgress}%
            </p>
          )}
          {bufferProgress === 0 && (
            <p className="mt-3 text-white/60 text-[11px] font-medium">
              Menghubungkan...
            </p>
          )}
        </div>
      )}

      {/* Watermark Overlay */}
      {watermark && user && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden select-none touch-none">
          <div
            className="absolute text-white/10 font-bold text-sm md:text-base whitespace-nowrap select-none pointer-events-none mix-blend-overlay"
            style={{ top: '12%', left: '8%', transform: 'rotate(-15deg)' }}
          >
            {user.email}
          </div>
          <div
            className="absolute text-white/5 font-bold text-[10px] md:text-xs whitespace-nowrap select-none pointer-events-none mix-blend-overlay"
            style={{ bottom: '20%', right: '10%', transform: 'rotate(-10deg)' }}
          >
            PROPERTY OF ALFAJR • {user.name}
          </div>
          <div
            className="absolute text-white/8 font-bold text-xs md:text-sm whitespace-nowrap select-none pointer-events-none mix-blend-overlay"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }}
          >
            {user.email}
          </div>
        </div>
      )}
    </div>
  );
});

UniversalPlayer.displayName = 'UniversalPlayer';
export default UniversalPlayer;