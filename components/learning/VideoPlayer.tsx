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
import UniversalPlayer from "./UniversalPlayer";
import { ScreenProtection } from "@/components/shared/ScreenProtection";
import { APITypes } from "plyr-react";

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
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  const plyrRef = useRef<APITypes>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Sync plyr's internal video element to our ref
  useEffect(() => {
    const plyrInstance = plyrRef.current?.plyr as any;
    if (plyrInstance?.media) {
      videoElementRef.current = plyrInstance.media as HTMLVideoElement;
    }
  }, [plyrRef.current]);

  const [isVideoCompleted, setIsVideoCompleted] = useState(initialCompleted);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleMarkComplete = async () => {
    // ... (logic is unchanged)
    if (!user || !isVideoCompleted) return;
    setIsUpdating(true);
    toast.loading('Menyimpan progress...');
    
    try {
      const res = await authFetch('/api/progress/lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, courseId, lessonId: lesson.id })
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
      case 'video-upload':
        return (
          <ScreenProtection 
            userEmail={user?.email}
            videoElementRef={videoElementRef}
          >
            <UniversalPlayer 
              ref={plyrRef}
              src={lesson.url}
              contentType={lesson.contentType}
              onEnded={() => setIsVideoCompleted(true)}
              onTimeUpdate={(currentTime, duration) => {
                if (duration > 0 && (currentTime / duration) >= 0.9) {
                  setIsVideoCompleted(true);
                }
              }}
              watermark={lesson.watermark}
              disableSeeking={!isVideoCompleted}
            />
          </ScreenProtection>
        );
      default:
        return <p>Tipe konten tidak didukung.</p>
    }
  };

  return (

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

  );
}