"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  FileText,
  Youtube,
  Clock,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import VdoCipherPlayer from "./VdoCipherPlayer";

interface LessonPlayerMobileProps {
  courseId: string;
  courseTitle: string;
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  completedLessons: string[];
  isCompleted: boolean;
}

export function LessonPlayerMobile({
  courseId,
  courseTitle,
  lesson,
  prevLesson,
  nextLesson,
  completedLessons,
  isCompleted: initialCompleted,
}: LessonPlayerMobileProps) {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const videoId = useMemo(() => {
    if (lesson.contentType === "youtube") {
      return getYouTubeId(lesson.url);
    }
    return null;
  }, [lesson.url, lesson.contentType]);

  const [player, setPlayer] = useState<YT.Player | null>(null);
  const [progressInterval, setProgressInterval] = useState<NodeJS.Timeout | null>(null);

  const [isVideoCompleted, setIsVideoCompleted] = useState(initialCompleted);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showLessonMenu, setShowLessonMenu] = useState(false);
  
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoElementRef = useRef<HTMLVideoElement>(null as any); // For Plyr

  // Initialize completion state for text content
  useEffect(() => {
    if (lesson.contentType === 'text' || lesson.contentType === 'image-upload' || lesson.contentType === 'file-upload') {
      setIsVideoCompleted(true);
    } else {
      setIsVideoCompleted(initialCompleted);
    }
  }, [lesson.id, initialCompleted, lesson.contentType]);

  useEffect(() => {
    return () => {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
    };
  }, [progressInterval]);

  const onPlayerStateChange = (event: YT.OnStateChangeEvent) => {
    if (event.data === YT.PlayerState.PLAYING) {
      if (progressInterval) clearInterval(progressInterval);
      const interval = setInterval(() => {
        if (player) {
          const currentTime = player.getCurrentTime();
          const duration = player.getDuration();
          if (duration > 0 && (currentTime / duration) >= 0.9) {
            setIsVideoCompleted(true);
            if(interval) clearInterval(interval);
          }
        }
      }, 1000);
      setProgressInterval(interval);
    } else {
      if (progressInterval) clearInterval(progressInterval);
    }
    if (event.data === YT.PlayerState.ENDED) {
      setIsVideoCompleted(true);
    }
  };

  useEffect(() => {
    if (!videoId) return;
    
    const onYouTubeIframeAPIReady = () => {
      if (player) {
         try { player.destroy(); } catch(e) {} 
      }
      if (progressInterval) clearInterval(progressInterval);
      
      const newPlayer = new YT.Player(`youtube-player-mobile-${lesson.id}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        host: 'https://www.youtube-nocookie.com', // Moved host out of playerVars
        playerVars: { 
          'playsinline': 1, 
          'controls': 0, // IMPORTANT: No native controls
          'rel': 0, 
          'modestbranding': 1,
          'disablekb': 1,
          'iv_load_policy': 3,
        },
        events: { 
          'onStateChange': onPlayerStateChange,
          'onReady': (event) => {
            const iframe = event.target.getIframe();
            if (iframe) {
              videoElementRef.current = iframe as any;
            }
          }
        }
      });
      setPlayer(newPlayer);
    };
    
    if (window.YT && window.YT.Player) {
      onYouTubeIframeAPIReady();
    } else {
      (window as any).onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
    }
    
    return () => {
       if (progressInterval) clearInterval(progressInterval);
    };
  }, [videoId, lesson.id]);

  const handleMarkComplete = async () => {
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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href={`/learning/course/${courseId}`}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-black line-clamp-1">
                  {lesson.title}
                </h1>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {courseTitle}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowLessonMenu(true)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Video/Content Area */}
        <div className="bg-black relative w-full">
          {lesson.contentType === "text" ? (
            <div className="h-[calc(100vh-140px)] overflow-y-auto bg-white">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-[#C5A059]/10 rounded-lg flex items-center justify-center">
                    <BookOpen size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-black">Artikel</h2>
                    <p className="text-sm text-gray-500">{lesson.duration || '10'} menit</p>
                  </div>
                </div>
                <MarkdownRenderer content={lesson.textContent || ''} />
              </div>
            </div>
          ) : lesson.contentType === "image-upload" ? (
            <div className="h-[calc(100vh-140px)] overflow-y-auto bg-white flex flex-col items-center justify-center p-4">
              <img 
                src={lesson.url} 
                alt={lesson.title} 
                className="w-full h-auto rounded-lg shadow-sm"
              />
            </div>
          ) : lesson.contentType === "file-upload" ? (
            <div className="h-[calc(100vh-140px)] overflow-y-auto bg-white flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <Download size={32} />
              </div>
              <h2 className="text-lg font-bold text-black mb-2">File Materi</h2>
              <p className="text-xs text-gray-500 mb-6">Silakan unduh atau buka file materi melalui tombol di bawah.</p>
              <a 
                href={lesson.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-black text-sm font-bold rounded-lg hover:bg-[#B08F4A]"
              >
                <Download size={16} /> Buka / Unduh File
              </a>
            </div>
          ) : (
            <div
              className="relative w-full bg-black rounded-lg overflow-hidden"
              data-protected="true"
            >
              {lesson.contentType === 'youtube' && videoId ? (
                <div
                  ref={videoContainerRef}
                  className="relative w-full"
                  style={{ paddingTop: "56.25%" }} // Maintain aspect ratio
                  data-protected="true"
                >
                  <div
                    id={`youtube-player-mobile-${lesson.id}`}
                    className="absolute top-0 left-0 w-full h-full"
                  />
                  {/* Minimal overlay to prevent accidental interaction with hidden YouTube elements if any */}
                  <div
                    className="absolute bottom-0 left-0 w-full"
                    style={{ height: '100px', zIndex: 10, cursor: 'not-allowed' }}
                  />
                </div>
              ) : lesson.contentType === 'vdocipher' && lesson.url ? (
                <VdoCipherPlayer videoId={lesson.url} />
              ) : lesson.contentType === 'video-upload' && lesson.url ? (
                <div className="aspect-video w-full">
                  <video 
                    src={lesson.url} 
                    className="w-full h-full" 
                    controls 
                    controlsList="nodownload"
                    onEnded={() => setIsVideoCompleted(true)}
                  />
                </div>
              ) : (
                <p className="text-white p-4 text-center">Tipe konten tidak didukung.</p>
              )}
            </div>
          )}
        </div>

        {/* Content Information & Actions */}
        <div className="bg-white border-t border-gray-200 flex-1">
          {/* Lesson Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-bold text-black">{lesson.title}</h3>
              <div className="flex items-center text-sm text-gray-500">
                <Clock size={14} className="mr-1" />
                {lesson.duration || '10'} menit
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {isVideoCompleted 
                ? "✓ Materi ini sudah selesai dipelajari" 
                : lesson.contentType === 'text' 
                  ? "✓ Baca artikel untuk menyelesaikan materi" 
                  : "✓ Tonton video hingga selesai untuk melanjutkan."}
            </p>
          </div>

          {/* Attachments Section */}
          {lesson.attachmentUrl && lesson.attachmentName && (
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-sm font-bold text-black mb-2 flex items-center gap-2">
                <LinkIcon size={16} />
                Materi Pendukung
              </h4>
              <a
                href={lesson.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-3 bg-gray-50 hover:bg-[#FFF8E7] rounded-lg border border-gray-200 transition-colors"
              >
                <Download size={18} className="text-[#C5A059] mr-3" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-black text-sm truncate">
                    {lesson.attachmentName}
                  </p>
                  <p className="text-xs text-gray-500">Klik untuk mengunduh</p>
                </div>
              </a>
            </div>
          )}

          {/* Navigation & Completion */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              {prevLesson ? (
                <Link
                  href={`/learning/course/${courseId}/lesson/${prevLesson.id}`}
                  className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft size={16} />
                  <div className="text-left">
                    <p className="text-xs text-gray-500">Sebelumnya</p>
                    <p className="text-sm font-medium text-black line-clamp-1 max-w-[120px]">
                      {prevLesson.title}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="w-[140px]" />
              )}
              
              {nextLesson ? (
                <Link
                  href={`/learning/course/${courseId}/lesson/${nextLesson.id}`}
                  className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Selanjutnya</p>
                    <p className="text-sm font-medium text-black line-clamp-1 max-w-[120px]">
                      {nextLesson.title}
                    </p>
                  </div>
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <div className="w-[140px]" />
              )}
            </div>
            
            <button
              onClick={handleMarkComplete}
              disabled={!isVideoCompleted || isUpdating}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
                isVideoCompleted && !isUpdating
                  ? "bg-green-600 hover:bg-green-700 text-white shadow-md"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {isUpdating ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={18} />
                  <span>{nextLesson ? "Selesai & Lanjut" : "Selesai Kursus"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Lesson Menu Modal */}
        {showLessonMenu && (
          <div className="fixed inset-0 bg-black/50 z-50">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-black">Navigasi Materi</h3>
                <button
                  onClick={() => setShowLessonMenu(false)}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-[#FFF8E7] p-4 rounded-lg border border-[#C5A059]/20">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-[#C5A059]/10 rounded-lg flex items-center justify-center">
                      {lesson.contentType === 'youtube' ? (
                        <Youtube size={20} className="text-[#C5A059]" />
                      ) : (
                        <FileText size={20} className="text-[#C5A059]" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-black">Materi Saat Ini</h4>
                      <p className="text-sm text-gray-600">{lesson.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock size={14} className="mr-1" />
                    {lesson.duration || '10'} menit • 
                    <span className="ml-1 capitalize">{lesson.contentType}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-bold text-black text-sm">Navigasi</h4>
                  
                  {prevLesson && (
                    <Link
                      href={`/learning/course/${courseId}/lesson/${prevLesson.id}`}
                      onClick={() => setShowLessonMenu(false)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <ChevronLeft size={16} className="text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-black line-clamp-1">{prevLesson.title}</p>
                        <p className="text-xs text-gray-500">Materi sebelumnya</p>
                      </div>
                    </Link>
                  )}
                  
                  {nextLesson && (
                    <Link
                      href={`/learning/course/${courseId}/lesson/${nextLesson.id}`}
                      onClick={() => setShowLessonMenu(false)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 text-right">
                        <p className="text-sm font-medium text-black line-clamp-1">{nextLesson.title}</p>
                        <p className="text-xs text-gray-500">Materi selanjutnya</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400" />
                    </Link>
                  )}
                </div>
                
                <Link
                  href={`/learning/course/${courseId}`}
                  onClick={() => setShowLessonMenu(false)}
                  className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft size={16} className="text-gray-600" />
                  <span className="text-sm font-medium text-black">Kembali ke Halaman Kursus</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
