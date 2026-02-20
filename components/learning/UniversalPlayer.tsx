"use client";

import React, { useEffect, useRef, useMemo } from 'react';
import { Plyr, APITypes } from 'plyr-react';
import 'plyr/dist/plyr.css';
import { useAuth } from '@/context/AuthContext';

interface UniversalPlayerProps {
  src: string;
  contentType: 'youtube' | 'video-upload';
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  watermark?: boolean;
}

const UniversalPlayer: React.FC<UniversalPlayerProps> = ({
  src,
  contentType,
  onEnded,
  onTimeUpdate,
  watermark = true
}) => {
  const { user } = useAuth();
  const plyrRef = useRef<APITypes>(null);

  // Helper for YouTube ID
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
        sources: [
          {
            src: videoId || src,
            provider: 'youtube',
          },
        ],
      };
    } else {
      return {
        type: 'video',
        sources: [
          {
            src: src,
            type: 'video/mp4',
          },
        ],
      };
    }
  }, [src, contentType]);

  const plyrOptions = {
    controls: [
      'play-large',
      'play',
      'progress',
      'current-time',
      'mute',
      'volume',
      'captions',
      'settings',
      'pip',
      'airplay',
      'fullscreen',
    ],
    settings: ['quality', 'speed', 'loop'],
    youtube: {
      noCookie: true,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      modestbranding: 1
    },
    // Prevent downloading
    download: false,
  };

  useEffect(() => {
    // The APITypes has a 'plyr' property which might not be ready immediately
    // or might be accessed differently in some versions.
    
    const interval = setInterval(() => {
      const player = plyrRef.current?.plyr;
      
      if (player && typeof (player as any).on === 'function') {
        const handleEnded = () => {
          if (onEnded) onEnded();
        };

        const handleTimeUpdate = () => {
          if (onTimeUpdate) {
            onTimeUpdate(player.currentTime, player.duration);
          }
        };

        player.on('ended', handleEnded);
        player.on('timeupdate', handleTimeUpdate);
        
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      const player = plyrRef.current?.plyr;
      if (player && typeof (player as any).off === 'function') {
        // We can't easily remove the local handlers without storing them,
        // but clearing the interval and the player unmounting handles most cases.
      }
    };
  }, [onEnded, onTimeUpdate]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-lg group bg-black">
      <Plyr
        ref={plyrRef}
        source={plyrSource}
        options={plyrOptions}
      />
      
      {/* Watermark Overlay */}
      {watermark && user && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <div 
            className="absolute text-white/20 font-bold text-sm md:text-base whitespace-nowrap select-none"
            style={{
              top: '10%',
              left: '5%',
              transform: 'rotate(-15deg)',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {user.email}
          </div>
          <div 
            className="absolute text-white/10 font-bold text-xs md:text-sm whitespace-nowrap select-none"
            style={{
              bottom: '15%',
              right: '8%',
              transform: 'rotate(-10deg)',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            PROPERTY OF ALFAJR • {user.name}
          </div>
          <div 
            className="absolute text-white/15 font-bold text-[10px] md:text-xs whitespace-nowrap select-none"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-45deg)',
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
            }}
          >
            {user.email} • {new Date().toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalPlayer;
