"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Lesson, Section } from "@/types";
import { Playlist } from "./Playlist";
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
  Save,
  BookmarkCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import UniversalPlayer from "./UniversalPlayer";
import { LessonSkeleton } from "./LessonSkeleton";
import { getIsNativeApp } from "@/lib/native-detection";

interface LessonPlayerDesktopProps {
  courseId: string;
  courseTitle: string;
  sections: Section[];
  lesson: Lesson;
  prevLesson: Lesson | null;
  nextLesson: Lesson | null;
  completedLessons: string[];
  isCompleted: boolean;
}

export function LessonPlayerDesktop({
  courseId,
  courseTitle,
  sections,
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
  const [currentCompletedLessons, setCurrentCompletedLessons] = useState<string[]>(completedLessons);
  const hasAutoSavedRef = useRef<boolean>(false);

  useEffect(() => {
    setCurrentCompletedLessons(completedLessons);
  }, [completedLessons]);

  useEffect(() => {
    hasAutoSavedRef.current = false;
    if (['text', 'image-upload', 'file-upload'].includes(lesson.contentType)) {
      setIsVideoCompleted(true);
    } else {
      setIsVideoCompleted(initialCompleted || completedLessons.includes(lesson.id));
    }
  }, [lesson.id, initialCompleted, lesson.contentType, completedLessons]);

  const saveProgress = async (isManualClick: boolean = false) => {
    if (!user) return;
    if (!isManualClick && hasAutoSavedRef.current) return;
    hasAutoSavedRef.current = true;

    if (isManualClick) {
      setIsUpdating(true);
      toast.loading('Menyimpan progress...');
    }

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
      setIsVideoCompleted(true);
      setCurrentCompletedLessons(prev => prev.includes(lesson.id) ? prev : [...prev, lesson.id]);

      if (isManualClick) {
        toast.dismiss();
        toast.success('Progress berhasil disimpan!');

        const isCourseCompleted = data.data?.status === 'completed';
        if (isCourseCompleted) {
          router.push(`/learning/course/${courseId}/complete`);
        } else if (nextLesson) {
          router.push(`/learning/course/${courseId}/lesson/${nextLesson.id}`);
        } else {
          router.push('/learning/dashboard');
        }
        router.refresh();
      } else {
        toast.success('Video selesai & progress tersimpan!', { id: `auto-save-${lesson.id}` });
        router.refresh();
      }
    } catch (error: any) {
      console.error('Error saving progress:', error);
      if (isManualClick) {
        toast.dismiss();
        toast.error(`Terjadi kesalahan: ${error.message}`);
      }
    } finally {
      if (isManualClick) {
        setIsUpdating(false);
      }
    }
  };

  const handleMarkComplete = () => {
    saveProgress(true);
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
            <p className="text-[10px] text-[#0284c7] font-semibold uppercase tracking-widest truncate">
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
      <div className="flex-1 flex flex-row h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Sidebar: Playlist */}
        <div className="hidden lg:block w-80 bg-white border-r border-slate-200 h-full overflow-y-auto shrink-0 shadow-xs">
          <Playlist
            courseId={courseId}
            sections={sections}
            currentLessonId={lesson.id}
            completedLessons={currentCompletedLessons}
          />
        </div>

        {/* Right Pane: Player / Content */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 h-full">
          {/* Player Area */}
          <div className="bg-black rounded-xl overflow-hidden mx-4 md:mx-6 mt-4">
            {isVideoContent ? (
              <div className="max-w-5xl mx-auto w-full p-4 md:p-6">
                <UniversalPlayer
                  src={lesson.url}
                  contentType={lesson.contentType as any}
                  onEnded={() => {
                    setIsVideoCompleted(true);
                    saveProgress(false);
                  }}
                  onTimeUpdate={(currentTime, duration) => {
                    if (duration > 0 && (currentTime / duration) >= 0.9) {
                      setIsVideoCompleted(true);
                      saveProgress(false);
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
                  <div className="w-11 h-11 bg-sky-50 rounded-xl flex items-center justify-center">
                    <BookOpen size={20} className="text-[#0284c7]" />
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
                <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Download size={28} className="text-[#0284c7]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">File Materi</h2>
                <p className="text-sm text-gray-500 mb-5">Silakan unduh atau buka file materi melalui tombol di bawah.</p>
                {(() => {
                  const isPdf = /\.pdf$/i.test(lesson.url || '');
                  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lesson.url || '');
                  const isViewable = isPdf || isImage;
                  const href = isViewable 
                    ? `/learning/view-file?url=${encodeURIComponent(lesson.url)}&name=${encodeURIComponent(lesson.title)}` 
                    : lesson.url;
                  
                  return (
                    <a
                      href={href}
                      target={isViewable ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[#0284c7] text-white font-bold rounded-xl hover:bg-[#D4AF6A] transition-colors"
                    >
                      <Download size={18} /> {isViewable ? 'Buka File Materi' : 'Buka / Unduh File'}
                    </a>
                  );
                })()}
              </div>
            )}

            {/* Lesson Info (for video content) */}
            {isVideoContent && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{lesson.title}</h3>
                  <button
                    onClick={() => saveProgress(false)}
                    disabled={!isVideoCompleted || isUpdating}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                      currentCompletedLessons.includes(lesson.id)
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : isVideoCompleted
                          ? "bg-sky-50 text-[#0284c7] border-sky-200 hover:bg-sky-100 cursor-pointer"
                          : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    }`}
                  >
                    {currentCompletedLessons.includes(lesson.id) ? (
                      <><BookmarkCheck size={14} className="text-emerald-600" /> Progress Tersimpan</>
                    ) : (
                      <><Save size={14} /> Simpan Progress</>
                    )}
                  </button>
                </div>
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
                {(() => {
                  const isNative = getIsNativeApp();
                  const isPdf = /\.pdf$/i.test(lesson.attachmentUrl || '');
                  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(lesson.attachmentUrl || '');
                  const isViewable = isPdf || isImage;
                  const useViewer = isNative || isViewable;
                  
                  return (
                    <a
                      href={useViewer ? `/learning/view-file?url=${encodeURIComponent(lesson.attachmentUrl)}&name=${encodeURIComponent(lesson.attachmentName)}` : lesson.attachmentUrl}
                      target={useViewer ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-sky-50 hover:border-[#0284c7]/20 rounded-xl border border-gray-100 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 transition-colors">
                        <FileText size={18} className="text-[#0284c7]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{lesson.attachmentName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{useViewer ? 'Klik untuk membuka' : 'Klik untuk mengunduh'}</p>
                      </div>
                      <Download size={16} className="text-gray-500 flex-shrink-0 group-hover:text-[#0284c7] transition-colors" />
                    </a>
                  );
                })()}
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

                {/* Complete & Save buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveProgress(false)}
                    disabled={!isVideoCompleted || isUpdating}
                    className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold text-sm rounded-xl border transition-all duration-200 ${
                      currentCompletedLessons.includes(lesson.id)
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : isVideoCompleted
                          ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50 shadow-xs"
                          : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    }`}
                    title="Simpan progres materi ini tanpa berpindah halaman"
                  >
                    {currentCompletedLessons.includes(lesson.id) ? (
                      <>
                        <BookmarkCheck size={16} className="text-emerald-600" />
                        <span>Tersimpan</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} className={isVideoCompleted ? "text-[#0284c7]" : "text-gray-400"} />
                        <span>Simpan Progress</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleMarkComplete}
                    disabled={!isVideoCompleted || isUpdating}
                    className={`flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm rounded-xl transition-all duration-300 ${
                      isVideoCompleted && !isUpdating
                        ? "bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-lg shadow-[#0284c7]/20 hover:shadow-[#0284c7]/30 hover:scale-[1.02]"
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
    </div>
  );
}
