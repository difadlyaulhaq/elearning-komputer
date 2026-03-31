"use client";

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Plyr, APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css';
import { useAuth } from '@/context/AuthContext';
import Hls from 'hls.js';

interface UniversalPlayerProps {
  src: string;
  contentType: 'youtube' | 'video-upload';
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  watermark?: boolean;
  disableSeeking?: boolean;
}

const UniversalPlayer = React.forwardRef<APITypes, UniversalPlayerProps>(({
  src,
  contentType,
  onEnded,
  onTimeUpdate,
  watermark = true,
  disableSeeking = false
}, ref) => {
  const { user } = useAuth();
  const internalPlyrRef = useRef<APITypes>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const [, setHlsInstance] = useState<Hls | null>(null);
  
  const plyrRef = (ref as React.RefObject<APITypes>) || internalPlyrRef;

  const lastTimeRef = useRef(0);
  const maxTimeReachedRef = useRef(0);

  // Sync ref for external components (like ScreenProtection)
  React.useImperativeHandle(ref, () => ({
    get plyr() {
      const plyrInstance = internalPlyrRef.current?.plyr as any;
      return {
        media: nativeVideoRef.current || plyrInstance?.media,
        currentTime: nativeVideoRef.current?.currentTime || plyrInstance?.currentTime,
        duration: nativeVideoRef.current?.duration || plyrInstance?.duration,
      };
    }
  } as any), [contentType, src]);

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const plyrSource: any = useMemo(() => {
    if (contentType === 'youtube') {
      const videoId = getYouTubeId(src);
      return {
        type: 'video',
        sources: [{ src: videoId || src, provider: 'youtube' }],
      };
    } else {
      return {
        type: 'video',
        sources: [{ src: src, type: 'video/mp4', size: 720 }],
        crossOrigin: 'anonymous',
      };
    }
  }, [src, contentType]);

  const plyrOptions = {
    attributes: {
      preload: 'auto',
      crossorigin: 'anonymous',
      playsinline: 'true',
    },
    controls: [
      'play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 
      'captions', 'settings', 'pip', 'airplay', 'fullscreen'
    ],
    settings: ['quality', 'speed', 'loop'],
    youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1, autoplay: 0 },
    ratio: '16:9',
    fullscreen: { enabled: true, fallback: true, iosNative: true },
    download: false,
    keyboard: { focused: true, global: false },
    tooltips: { controls: true, seek: true },
    quality: { default: 720, options: [1080, 720, 480, 360] },
    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
  };

  // Logic for native video element
  const handleNativeTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (disableSeeking) {
      if (video.currentTime > maxTimeReachedRef.current + 2) {
        video.currentTime = maxTimeReachedRef.current;
      } else if (video.currentTime > maxTimeReachedRef.current) {
        maxTimeReachedRef.current = video.currentTime;
      }
    }
    lastTimeRef.current = video.currentTime;
    if (onTimeUpdate) onTimeUpdate(video.currentTime, video.duration);
  };

  useEffect(() => {
    // Only init Plyr if we're not using native fallback
    if (contentType === 'video-upload' && !src.includes('.m3u8')) return;

    let player: any = null;
    let isMounted = true;
    let hls: Hls | null = null;

    const handleEnded = () => { if (onEnded) onEnded(); };

    const handleTimeUpdate = () => {
      if (!player) return;
      if (disableSeeking) {
        if (player.currentTime > maxTimeReachedRef.current + 2) {
          player.currentTime = maxTimeReachedRef.current;
        } else if (player.currentTime > maxTimeReachedRef.current) {
          maxTimeReachedRef.current = player.currentTime;
        }
      }
      lastTimeRef.current = player.currentTime;
      if (onTimeUpdate) onTimeUpdate(player.currentTime, player.duration);
    };

    const initPlayer = () => {
      player = internalPlyrRef.current?.plyr;
      if (player && typeof player.on === 'function' && isMounted) {
        player.on('ended', handleEnded);
        player.on('timeupdate', handleTimeUpdate);

        if (contentType === 'video-upload') {
          const videoElement = player.media;
          if (src.includes('.m3u8')) {
            if (Hls.isSupported()) {
              hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                enableWorker: true,
              });
              hls.loadSource(src);
              hls.attachMedia(videoElement);
              setHlsInstance(hls);
            }
          }
        }
        return true;
      }
      return false;
    };

    const intervalId = setInterval(() => { if (initPlayer()) clearInterval(intervalId); }, 500);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (hls) hls.destroy();
      if (player && typeof player.off === 'function') {
        player.off('ended', handleEnded);
        player.off('timeupdate', handleTimeUpdate);
      }
    };
  }, [onEnded, onTimeUpdate, disableSeeking, src, contentType]);

  const isNativeFallback = contentType === 'video-upload' && !src.includes('.m3u8');

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-lg group bg-black">
      {isNativeFallback ? (
        <video
          ref={nativeVideoRef}
          src={src}
          className="w-full aspect-video"
          controls
          preload="metadata"
          controlsList="nodownload"
          onEnded={onEnded}
          onTimeUpdate={handleNativeTimeUpdate}
          onContextMenu={(e) => e.preventDefault()}
          crossOrigin="anonymous"
          playsInline
        />
      ) : (
        <Plyr ref={internalPlyrRef} source={plyrSource} options={plyrOptions} />
      )}
      
      {watermark && user && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden opacity-60">
          <div className="absolute text-white/20 font-bold text-sm md:text-base whitespace-nowrap select-none" style={{ top: '10%', left: '5%', transform: 'rotate(-15deg)' }}>{user.email}</div>
          <div className="absolute text-white/10 font-bold text-xs md:text-sm whitespace-nowrap select-none" style={{ bottom: '15%', right: '8%', transform: 'rotate(-10deg)' }}>PROPERTY OF ALFAJR • {user.name}</div>
          <div className="absolute text-white/15 font-bold text-[10px] md:text-xs whitespace-nowrap select-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)' }}>{user.email} • {new Date().toLocaleDateString()}</div>
        </div>
      )}
    </div>
  );
});

export default UniversalPlayer;
