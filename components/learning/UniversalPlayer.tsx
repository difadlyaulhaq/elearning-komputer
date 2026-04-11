"use client";

import React, { useEffect, useRef } from 'react';
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

  // Function to initialize the player
  const initPlayer = () => {
    if (!videoRef.current) return;

    // Remove any existing video element to start fresh
    videoRef.current.innerHTML = '';
    const videoEl = document.createElement('video');
    videoEl.className = 'video-js vjs-alfajr vjs-big-play-centered';
    videoEl.setAttribute('playsinline', 'true');
    videoRef.current.appendChild(videoEl);

    const isMobile = isMobileDevice();
    const isHls = src.includes('.m3u8');
    const sources =
      contentType === 'youtube'
        ? [{ src, type: 'video/youtube' }]
        : [{ src, type: isHls ? 'application/x-mpegURL' : 'video/mp4' }];

    const player = videojs(videoEl, {
      controls: true,
      autoplay: false,
      preload: isMobile ? 'metadata' : 'auto',
      fluid: true,
      responsive: true,
      playsinline: true,
      aspectRatio: '16:9',
      html5: {
        vhs: {
          overrideNative: !isMobile,
          enableLowInitialPlaylist: true,
          fastQualityChange: true,
          goalBufferLength: isMobile ? 15 : 30, // Reduced for mobile
          maxBufferLength: isMobile ? 30 : 60,  // Reduced for mobile
          bufferLowWatermark: isMobile ? 3 : 5,
        },
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
      // Error recovery logic
      retryOnError: true,
    }, () => {
      // Player ready
      if (ref) {
        if (typeof ref === 'function') ref(player);
        else (ref as React.MutableRefObject<any>).current = player;
      }
    });

    playerRef.current = player;

    // Handle Network Errors & Auto-retry
    player.on('error', () => {
      const error = player.error();
      if (error && (error.code === 2 || error.code === 4)) {
        console.log('Network error detected, attempting to recover...');
        setTimeout(() => {
          if (playerRef.current && !playerRef.current.isDisposed()) {
            playerRef.current.src(sources);
            playerRef.current.load();
            playerRef.current.play()?.catch(() => {});
          }
        }, 2000);
      }
    });

    // Smart Buffering for MP4
    if (contentType === 'video-upload' && !isHls) {
      player.on('waiting', () => {
        console.log('Video is buffering...');
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
      if (playerRef.current && !playerRef.current.isDisposed()) {
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

        /* ── Spinner ── */
        .vjs-alfajr .vjs-loading-spinner {
          border-color: #C5A059 !important;
        }

        /* ── No outline ── */
        .vjs-alfajr:focus,
        .vjs-alfajr *:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>

      <div ref={videoRef} className="w-full h-full" />

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