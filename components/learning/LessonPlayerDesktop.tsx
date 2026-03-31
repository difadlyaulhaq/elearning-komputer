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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
// import { ScreenProtection } from "@/components/shared/ScreenProtection";
import UniversalPlayer from "./UniversalPlayer";
import { LessonSkeleton } from "./LessonSkeleton";

interface LessonPlayerDesktopProps {
  courseId: string;
  courseTitle: string;
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  completedLessons: string[];
  isCompleted: boolean;
}

export function LessonPlayerDesktop({
  courseId,
  courseTitle,
  lesson,
  prevLesson,
  nextLesson,
  completedLessons,
  isCompleted: initialCompleted,
}: LessonPlayerDesktopProps) {
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();
  
  const [isVideoCompleted, setIsVideoCompleted] = useState(initialCompleted);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (['text', 'image-upload', 'file-upload'].includes(lesson.contentType)) {
      setIsVideoCompleted(true);
    } else {
      setIsVideoCompleted(initialCompleted);
    }
  }, [lesson.id, initialCompleted, lesson.contentType]);

  const handleMarkComplete = async () => {
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
    return <LessonSkeleton />;
  }

  return (

      <div className="flex-1 flex flex-col bg-[#F8F9FA] min-h-screen">
        {/* Desktop Header */}
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
            <p className="text-sm text-gray-500">{courseTitle}</p>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          {lesson.contentType === "text" ? (
            <div className="bg-white p-6 md:p-8 rounded-lg border max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-[#C5A059]/10 rounded-lg flex items-center justify-center">
                  <LinkIcon size={24} className="text-[#C5A059]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-black">Artikel Pembelajaran</h2>
                  <p className="text-gray-500">{lesson.duration || '10'} menit membaca</p>
                </div>
              </div>
              <MarkdownRenderer content={lesson.textContent || ''} />
            </div>
          ) : lesson.contentType === "image-upload" ? (
            <div className="bg-white p-6 md:p-8 rounded-lg border max-w-4xl mx-auto">
              <img 
                src={lesson.url} 
                alt={lesson.title} 
                className="w-full h-auto rounded-lg shadow-md"
              />
            </div>
          ) : lesson.contentType === "file-upload" ? (
            <div className="bg-white p-6 md:p-8 rounded-lg border max-w-4xl mx-auto text-center">
              <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download size={40} />
              </div>
              <h2 className="text-xl font-bold text-black mb-2">File Materi</h2>
              <p className="text-gray-500 mb-6">Silakan unduh atau buka file materi melalui tombol di bawah.</p>
              <a 
                href={lesson.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-black font-bold rounded-lg hover:bg-[#B08F4A] transition-colors"
              >
                <Download size={20} /> Buka / Unduh File
              </a>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <UniversalPlayer 
                src={lesson.url}
                contentType={lesson.contentType as any}
                onEnded={() => setIsVideoCompleted(true)}
                onTimeUpdate={(currentTime, duration) => {
                  if (duration > 0 && (currentTime / duration) >= 0.9) {
                    setIsVideoCompleted(true);
                  }
                }}
                watermark={lesson.watermark}
                disableSeeking={false}
              />
            </div>
          )}

          {/* Attachments Section */}
          {lesson.attachmentUrl && lesson.attachmentName && (
            <div className="max-w-4xl mx-auto mt-6">
              <div className="bg-white p-6 rounded-lg border">
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
            </div>
          )}

          {/* Completion Section */}
          <div className="max-w-4xl mx-auto mt-6">
            <div className="bg-white p-6 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-center md:text-left">
              <div className="flex-1">
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

          {/* Navigation */}
          <div className="max-w-4xl mx-auto mt-6 flex items-center justify-between">
            {prevLesson ? (
              <Link
                href={`/learning/course/${courseId}/lesson/${prevLesson.id}`}
                className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
              >
                <ChevronLeft size={16} />
                <span>Materi Sebelumnya</span>
              </Link>
            ) : (
              <div></div>
            )}
            
            {nextLesson ? (
              <Link
                href={`/learning/course/${courseId}/lesson/${nextLesson.id}`}
                className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
              >
                <span>Materi Selanjutnya</span>
                <ChevronRight size={16} />
              </Link>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </div>

  );
}
