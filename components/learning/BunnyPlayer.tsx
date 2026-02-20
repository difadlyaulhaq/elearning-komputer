'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface BunnyPlayerProps {
  videoId: string;
  onEnded: () => void;
  onTimeUpdate: (time: number, duration: number) => void;
}

export default function BunnyPlayer({ videoId, onEnded, onTimeUpdate }: BunnyPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!videoId) return;

    let hls: Hls | null = null;

    async function initializePlayer() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Ambil URL aman dari backend
        const response = await fetch('/api/learning/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(`Failed to get video URL: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        const signedUrl = data.signedUrl;

        if (!signedUrl) {
          throw new Error('No signed URL received from server.');
        }

        const videoElement = videoRef.current;
        if (!videoElement) return;

        // 2. Setup Hls.js
        if (Hls.isSupported()) {
          hls = new Hls({
            // Optional: Konfigurasi HLS untuk stabilitas
            // capLevelToPlayerSize: true,
            // maxBufferLength: 30,
            // maxMaxBufferLength: 600,
          });
          hls.loadSource(signedUrl);
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
             setIsLoading(false);
             videoElement.play().catch(e => console.error("Autoplay was prevented:", e));
          });
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS.js error:', data); // Keep detailed log for developers

            const userFriendlyMessage = 'Video tidak dapat dimuat. Mohon laporkan pesan teknis berikut ke admin:';

            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  setError(`${userFriendlyMessage} Network Error (${data.details})`);
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  setError(`${userFriendlyMessage} Media Error (${data.details})`);
                  break;
                default:
                  setError(`${userFriendlyMessage} Unrecoverable Error (${data.details})`);
                  break;
              }
            }
          });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          // Fallback untuk Safari/iOS native HLS
          videoElement.src = signedUrl;
          videoElement.addEventListener('loadedmetadata', () => {
             setIsLoading(false);
             videoElement.play().catch(e => console.error("Autoplay was prevented:", e));
          });
           videoElement.addEventListener('error', () => {
            setError('Gagal memuat video pada browser ini.');
          });
        } else {
            setError('Browser Anda tidak mendukung pemutaran video HLS.');
        }

      } catch (err: any) {
        console.error("Error initializing player:", err);
        setError(err.message || 'Gagal menyiapkan video. Periksa koneksi Anda.');
        setIsLoading(false);
      }
    }

    initializePlayer();

    // Cleanup
    return () => {
      hls?.destroy();
    };
  }, [videoId]);

  useEffect(() => {
     const videoElement = videoRef.current;
     if(!videoElement) return;

     const handleTimeUpdate = () => {
       if (videoElement.duration) {
         onTimeUpdate(videoElement.currentTime, videoElement.duration);
       }
     };
     const handleEnded = () => onEnded();

     videoElement.addEventListener('timeupdate', handleTimeUpdate);
     videoElement.addEventListener('ended', handleEnded);

     return () => {
         videoElement.removeEventListener('timeupdate', handleTimeUpdate);
         videoElement.removeEventListener('ended', handleEnded);
     }
  }, [onTimeUpdate, onEnded]);


  return (
    <div className="relative w-full aspect-video bg-black flex items-center justify-center text-white">
      {isLoading && <p>Memuat video...</p>}
      {error && <div className="p-4 text-center">
        <p className="font-semibold">Terjadi Kesalahan</p>
        <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>}
      <video
        ref={videoRef}
        controls
        className={`w-full h-full ${isLoading || error ? 'hidden' : ''}`}
        playsInline // Penting untuk mobile
      />
    </div>
  );
}