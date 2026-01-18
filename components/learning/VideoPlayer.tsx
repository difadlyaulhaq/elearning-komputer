// components/learning/VideoPlayer.tsx
"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Lesson } from "@/types";
import {
  ArrowLeft,
  CheckCircle,
  Loader2,
  Download,
  Link as LinkIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { ScreenProtection } from "@/components/shared/ScreenProtection";
import BunnyPlayer from "./BunnyPlayer";

interface VideoPlayerProps {
  courseId: string;
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  isCompleted: boolean;
}

export function VideoPlayer({
  courseId,
  lesson,
  prevLesson,
  nextLesson,
  isCompleted: initialCompleted,
}: VideoPlayerProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [isVideoCompleted, setIsVideoCompleted] = useState(initialCompleted);
  const [isUpdating, setIsUpdating] = useState(false);
  const [ytPlayer, setYtPlayer] = useState<YT.Player | null>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);
  
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null as any);

  useEffect(() => {
    // Reset completion status when lesson changes
    if (lesson.contentType === 'text') {
      setIsVideoCompleted(true);
    } else {
      setIsVideoCompleted(initialCompleted);
    }
    // Destroy YouTube player if it exists and the next lesson is not YouTube
    if (ytPlayer && lesson.contentType !== 'youtube') {
      ytPlayer.destroy();
      setYtPlayer(null);
    }
  }, [lesson.id, initialCompleted, lesson.contentType, ytPlayer]);

  useEffect(() => {
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [progressInterval]);

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const youtubeVideoId = useMemo(() => {
    if (lesson.contentType === "youtube") {
      return getYouTubeId(lesson.url);
    }
    return null;
  }, [lesson.url, lesson.contentType]);
  
  // --- Generic Handlers ---
  const handleLessonEnd = () => {
    setIsVideoCompleted(true);
  };

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (duration > 0 && (currentTime / duration) >= 0.9) {
      if (!isVideoCompleted) {
        setIsVideoCompleted(true);
      }
    }
  };

  // --- YouTube Specific ---
  const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
    if (event.data === YT.PlayerState.PLAYING) {
      if (progressInterval) clearInterval(progressInterval);
      const interval = setInterval(() => {
        if (ytPlayer) {
          const currentTime = ytPlayer.getCurrentTime();
          const duration = ytPlayer.getDuration();
          handleTimeUpdate(currentTime, duration);
        }
      }, 1000);
      setProgressInterval(interval);
    } else {
      if (progressInterval) clearInterval(progressInterval);
    }
    if (event.data === YT.PlayerState.ENDED) {
      handleLessonEnd();
    }
  };

  useEffect(() => {
    if (lesson.contentType !== 'youtube' || !youtubeVideoId) {
      return;
    }

    let playerInstance: YT.Player | null = null;
    let checkInterval: NodeJS.Timeout | null = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !document.getElementById(`youtube-player-${lesson.id}`)) {
        return false;
      }

      try {
        if (ytPlayer) {
           ytPlayer.destroy();
        }
        
        playerInstance = new window.YT.Player(`youtube-player-${lesson.id}`, {
          height: '100%',
          width: '100%',
          videoId: youtubeVideoId,
          playerVars: { 
            'playsinline': 1, 'controls': 1, 'rel': 0, 
            'modestbranding': 1, 'disablekb': 1, 'origin': window.location.origin
          },
          events: { 
            'onStateChange': onPlayerStateChange,
            'onReady': (event) => {
              const iframe = event.target.getIframe();
              if (iframe) videoElementRef.current = iframe as any;
            },
            'onError': (e) => {
              console.error("YouTube Player Error:", e);
              toast.error("Gagal memuat video YouTube. Coba refresh halaman.");
            }
          }
        });
        setYtPlayer(playerInstance);
        return true;
      } catch (error) {
        console.error("Error init YouTube player:", error);
        return false;
      }
    };

    if (!window.YT) {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
    }

    checkInterval = setInterval(() => {
      const success = initPlayer();
      if (success && checkInterval) {
        clearInterval(checkInterval);
      }
    }, 500);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (progressInterval) clearInterval(progressInterval);
      playerInstance?.destroy();
    };
  }, [youtubeVideoId, lesson.id, lesson.contentType]);

  const handleMarkComplete = async () => {
    // ... (logic is unchanged)
    if (!user || !isVideoCompleted) return;
    setIsUpdating(true);
    toast.loading('Menyimpan progress...');
    
    try {
      const res = await fetch('/api/progress/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, courseId, lessonId: lesson.id })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal update progress');
      }
      
      const data = await res.json();
      toast.dismiss();
      toast.success('Progress berhasil disimpan!');
      
      const isCourseCompleted = data.data.status === 'completed';
      if (isCourseCompleted) {
        router.push(`/learning/course/${courseId}/complete`);
      } else if (nextLesson) {
        router.push(`/learning/course/${courseId}/lesson/${nextLesson.id}`);
      } else {
        router.push('/learning/dashboard');
      }
      router.refresh();
    } catch (error: any) {
      console.error(error);
      toast.dismiss();
      toast.error(`Terjadi kesalahan: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-12 h-12 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  const renderPlayer = () => {
    switch (lesson.contentType) {
      case 'text':
        return (
          <div className="bg-white p-6 md:p-8 rounded-lg border">
            <MarkdownRenderer content={lesson.textContent || ''} />
          </div>
        );
      case 'youtube':
        return (
          <div 
            ref={videoContainerRef}
            className="relative w-full bg-black rounded-lg overflow-hidden" 
            style={{ paddingTop: "56.25%" }}
            data-protected="true"
          >
            <div 
              id={`youtube-player-${lesson.id}`} 
              className="absolute top-0 left-0 w-full h-full" 
            />
          </div>
        );
      case 'bunny':
        return (
          <div 
            className="relative w-full bg-black rounded-lg overflow-hidden" 
            data-protected="true"
          >
            <BunnyPlayer 
              videoId={lesson.url}
              onEnded={handleLessonEnd}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        );
      default:
        return <p>Tipe konten tidak didukung.</p>
    }
  };

  return (
    <ScreenProtection userEmail={user?.email ?? ""} videoElementRef={videoElementRef}>
      <div className="flex-1 flex flex-col bg-[#F8F9FA]">
        <header className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10">
          <div className="flex-1">
            <Link 
              href={`/learning/course/${courseId}`} 
              className="text-sm text-gray-600 hover:text-black transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Kembali ke Detail Kursus
            </Link>
            <h1 className="text-lg md:text-xl font-bold text-black mt-1 truncate">
              {lesson.title}
            </h1>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          {renderPlayer()}

          {/* Attachments Section */}
          {lesson.attachmentUrl && lesson.attachmentName && (
            <div className="mt-6 bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-bold text-black mb-4 flex items-center gap-2">
                <LinkIcon size={18} />
                Materi Pendukung
              </h3>
              <div className="space-y-3">
                <a
                  href={lesson.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 bg-gray-50 hover:bg-[#FFF8E7] border rounded-lg transition-colors"
                >
                  <Download size={20} className="text-[#C5A059] mr-4" />
                  <span className="font-semibold text-black">
                    {lesson.attachmentName}
                  </span>
                </a>
              </div>
            </div>
          )}

          <div className="mt-6 bg-white p-6 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-center md:text-left">
            <div>
              <h2 className="text-lg font-bold text-black">{lesson.title}</h2>
              <p className="text-sm text-gray-500">
                {isVideoCompleted 
                  ? "Materi selesai. Silakan lanjut ke materi berikutnya." 
                  : lesson.contentType === 'text' 
                    ? "Silakan klik tombol di samping untuk melanjutkan." 
                    : "Tonton video hingga selesai untuk melanjutkan."}
              </p>
            </div>
            <button
              onClick={handleMarkComplete}
              disabled={!isVideoCompleted || isUpdating}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 font-semibold text-white rounded-lg transition-all ${
                isVideoCompleted && !isUpdating 
                  ? "bg-green-600 hover:bg-green-700 shadow-md" 
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {isUpdating ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <CheckCircle size={18} />
              )}
              {isUpdating 
                ? "Menyimpan..." 
                : (nextLesson ? "Selesai & Lanjut" : "Selesai Kursus")}
            </button>
          </div>
        </div>
      </div>
    </ScreenProtection>
  );
}