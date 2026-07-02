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
  Clock,
  Play,
  Lock,
  FileText,
  BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import UniversalPlayer from "./UniversalPlayer";
import { LessonSkeleton } from "./LessonSkeleton";
import { getIsNativeApp } from "@/lib/native-detection";

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

  const isVideoContent = !['text', 'image-upload', 'file-upload'].includes(lesson.contentType);

  return (
    <div className="flex-1 flex flex-col bg-[#F8F9FA] min-h-screen">
      {/* Desktop Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <Link
            href={`/learning/course/${courseId}`}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors flex-shrink-0 group"
          >
            <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
              <ArrowLeft size={14} />
            </div>
            <span className="hidden lg:block">Kembali</span>
          </Link>

          <div className="h-4 w-px bg-gray-200 hidden lg:block" />

          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#C5A059] font-semibold uppercase tracking-widest truncate">
              {courseTitle}
            </p>
            <h1 className="text-sm font-bold text-gray-900 truncate leading-tight">
              {lesson.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {lesson.duration && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
              <Clock size={12} />
              <span>{lesson.duration} menit</span>
            </div>
          )}
          <div className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
            isVideoCompleted
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {isVideoCompleted ? '✓ Selesai' : 'Sedang Belajar'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Left: Player / Content */}
        <div className="flex-1 flex flex-col">
          {/* Player Area */}
          <div className="bg-black rounded-xl overflow-hidden mx-4 md:mx-6 mt-4">
            {isVideoContent ? (
              <div className="max-w-5xl mx-auto w-full p-4 md:p-6">
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
            ) : lesson.contentType === "image-upload" ? (
              <div className="max-w-5xl mx-auto w-full p-4 md:p-6 flex justify-center">
                <img
                  src={lesson.url}
                  alt={lesson.title}
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
              </div>
            ) : null}
          </div>

          {/* Info + Content Area */}
          <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
            {/* Text content */}
            {lesson.contentType === "text" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-4">
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                  <div className="w-11 h-11 bg-[#C5A059]/10 rounded-xl flex items-center justify-center">
                    <BookOpen size={20} className="text-[#C5A059]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Artikel Pembelajaran</h2>
                    <p className="text-xs text-gray-500">{lesson.duration || '10'} menit membaca</p>
                  </div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <MarkdownRenderer content={lesson.textContent || ''} />
                </div>
              </div>
            )}

            {/* File Upload Content */}
            {lesson.contentType === "file-upload" && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center mb-4">
                <div className="w-16 h-16 bg-[#C5A059]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Download size={28} className="text-[#C5A059]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">File Materi</h2>
                <p className="text-sm text-gray-500 mb-5">Silakan unduh atau buka file materi melalui tombol di bawah.</p>
                <a
                  href={lesson.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#C5A059] text-black font-bold rounded-xl hover:bg-[#D4AF6A] transition-colors"
                >
                  <Download size={18} /> Buka / Unduh File
                </a>
              </div>
            )}

            {/* Lesson Info (for video content) */}
            {isVideoContent && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{lesson.title}</h3>
                <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl w-fit ${
                  isVideoCompleted
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {isVideoCompleted ? (
                    <><CheckCircle size={14} /> Materi selesai. Silakan lanjut ke materi berikutnya.</>
                  ) : (
                    <><Play size={13} /> Tonton video hingga selesai untuk melanjutkan.</>
                  )}
                </div>
              </div>
            )}

            {/* Attachment */}
            {lesson.attachmentUrl && lesson.attachmentName && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <LinkIcon size={12} /> Materi Pendukung
                </h3>
                <a
                  href={getIsNativeApp() ? `/learning/view-file?url=${encodeURIComponent(lesson.attachmentUrl)}&name=${encodeURIComponent(lesson.attachmentName)}` : lesson.attachmentUrl}
                  target={getIsNativeApp() ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-[#C5A059]/10 hover:border-[#C5A059]/20 rounded-xl border border-gray-100 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#C5A059]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#C5A059]/20 transition-colors">
                    <FileText size={18} className="text-[#C5A059]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{lesson.attachmentName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Klik untuk mengunduh</p>
                  </div>
                  <Download size={16} className="text-gray-500 flex-shrink-0 group-hover:text-[#C5A059] transition-colors" />
                </a>
              </div>
            )}

            {/* Completion & Navigation */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Navigation arrows */}
                <div className="flex items-center gap-2">
                  {prevLesson ? (
                    <Link
                      href={`/learning/course/${courseId}/lesson/${prevLesson.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all text-sm group"
                    >
                      <ChevronLeft size={15} className="text-gray-500" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Sebelumnya</p>
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1 max-w-[150px]">{prevLesson.title}</p>
                      </div>
                    </Link>
                  ) : (
                    <div />
                  )}

                  {nextLesson && (
                    <Link
                      href={`/learning/course/${courseId}/lesson/${nextLesson.id}`}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all text-sm group"
                    >
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Selanjutnya</p>
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1 max-w-[150px]">{nextLesson.title}</p>
                      </div>
                      <ChevronRight size={15} className="text-gray-500" />
                    </Link>
                  )}
                </div>

                {/* Complete button */}
                <button
                  onClick={handleMarkComplete}
                  disabled={!isVideoCompleted || isUpdating}
                  className={`flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm rounded-xl transition-all duration-300 ${
                    isVideoCompleted && !isUpdating
                      ? "bg-[#C5A059] hover:bg-[#b8913e] text-white shadow-lg shadow-[#C5A059]/20 hover:shadow-[#C5A059]/30 hover:scale-[1.02]"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
                  }`}
                >
                  {isUpdating ? (
                    <><Loader2 size={16} className="animate-spin" /><span>Menyimpan...</span></>
                  ) : isVideoCompleted ? (
                    <><CheckCircle size={16} /><span>{nextLesson ? "Selesai & Lanjut" : "Selesaikan Kursus"}</span></>
                  ) : (
                    <><Lock size={15} /><span>Selesaikan video dulu</span></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
