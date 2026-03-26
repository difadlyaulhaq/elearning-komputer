'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

interface VdoCipherPlayerProps {
  videoId: string;
}

interface PlaybackInfo {
  otp: string;
  playbackInfo: string;
}

const VdoCipherPlayer = ({ videoId }: VdoCipherPlayerProps) => {
  const { authFetch } = useAuth();
  const [playbackInfo, setPlaybackInfo] = useState<PlaybackInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [showThumbnail, setShowThumbnail] = useState(true);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);

  // 1. Load the VdoCipher Player script
  useEffect(() => {
    if (window.VdoPlayer) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://player.vdocipher.com/v2/player.js';
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      setError('Failed to load VdoCipher player script.');
      setLoading(false);
    }
    document.body.appendChild(script);

    return () => {
      // Clean up script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    }
  }, []);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setShowThumbnail(true);
        if (player.current) {
          player.current.pause();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handlePlayClick = () => {
    if (playerContainerRef.current) {
      playerContainerRef.current.requestFullscreen();
      setShowThumbnail(false);
    }
  };

  const onPlayerCreated = (vdoPlayer: any) => {
    player.current = vdoPlayer;
    player.current.play();
  };

  // 2. Fetch OTP and playbackInfo from our backend
  useEffect(() => {
    if (!scriptLoaded) return; // Wait for the script to load

    const fetchOtp = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await authFetch('/api/vdocipher', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch video credentials.');
        }

        const data: PlaybackInfo = await response.json();
        setPlaybackInfo(data);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchOtp();
    }
  }, [videoId, scriptLoaded, authFetch]);

  if (error) {
    return <div style={{ aspectRatio: '16 / 9', background: '#000', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Error: {error}</div>;
  }
  
  if (loading) {
    return <div style={{ aspectRatio: '16 / 9', background: '#000', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading Player...</div>;
  }
  
  // 3. Render the Web Component
  return (
    <div ref={playerContainerRef} style={{ position: 'relative', paddingTop: '56.25%', width: '100%', background: '#000' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {showThumbnail ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', background: 'black' }} onClick={handlePlayClick}>
            <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Video Thumbnail" />
            <div style={{ position: 'absolute', width: '80px', height: '80px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" style={{ width: '40px', height: '40px', fill: 'white' }}><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        ) : (
          scriptLoaded && playbackInfo && (
            React.createElement(
                'vdocipher-player' as any,
                {
                    playbackinfo: playbackInfo.playbackInfo,
                    otp: playbackInfo.otp,
                    onPlayerCreated: onPlayerCreated,
                    style: { width: '100%', height: '100%', border: 0 }
                }
            )
          )
        )}
      </div>
    </div>
  );
};

export default VdoCipherPlayer;
