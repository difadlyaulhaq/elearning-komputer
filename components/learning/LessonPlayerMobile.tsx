"use client";

import React, { useState, useEffect } from "react";
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
  Play,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import UniversalPlayer from "./UniversalPlayer";
import { LessonSkeleton } from "./LessonSkeleton";

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
  const { user, isLoading: authLoading, authFetch } = useAuth();
  const router = useRouter();

  const [isVideoCompleted, setIsVideoCompleted] = useState(initialCompleted);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showLessonMenu, setShowLessonMenu] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    if (
      lesson.contentType === "text" ||
      lesson.contentType === "image-upload" ||
      lesson.contentType === "file-upload"
    ) {
      setIsVideoCompleted(true);
    } else {
      setIsVideoCompleted(initialCompleted);
    }
  }, [lesson.id, initialCompleted, lesson.contentType]);

  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(
        window.innerWidth > window.innerHeight && window.innerHeight < 600
      );
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  const handleMarkComplete = async () => {
    if (!user || !isVideoCompleted) return;
    setIsUpdating(true);
    toast.loading("Menyimpan progress...");

    try {
      const res = await authFetch("/api/progress/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          courseId,
          lessonId: lesson.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Gagal update progress");
      }

      const data = await res.json();
      toast.dismiss();
      toast.success("Progress berhasil disimpan!");

      const isCourseCompleted = data.data.status === "completed";
      if (isCourseCompleted) {
        router.push(`/learning/course/${courseId}/complete`);
      } else if (nextLesson) {
        router.push(`/learning/course/${courseId}/lesson/${nextLesson.id}`);
      } else {
        router.push("/learning/dashboard");
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
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* Header */}
      {!isLandscape && (
        <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20 flex items-center gap-3">
          <Link
            href={`/learning/course/${courseId}`}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} className="text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-[#C5A059] font-bold uppercase tracking-widest truncate">
              {courseTitle}
            </p>
            <h1 className="text-sm font-bold text-gray-900 line-clamp-1 leading-tight">
              {lesson.title}
            </h1>
          </div>
          <button
            onClick={() => setShowLessonMenu(true)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <Menu size={18} className="text-gray-700" />
          </button>
        </header>
      )}

      {/* Video / Content Area */}
      <div
        className={`bg-[#F5F5F5] w-full ${
          isLandscape ? "flex-1 flex items-center justify-center" : ""
        }`}
      >
        {lesson.contentType === "text" ? (
          <div className="bg-white min-h-[40vh] p-5">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 bg-[#C5A059]/10 rounded-xl flex items-center justify-center">
                <BookOpen size={18} className="text-[#C5A059]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">
                  Artikel Materi
                </h2>
                <p className="text-xs text-gray-400">
                  {lesson.duration || "10"} menit membaca
                </p>
              </div>
            </div>
            <MarkdownRenderer content={lesson.textContent || ""} />
          </div>
        ) : lesson.contentType === "image-upload" ? (
          <div className="bg-white p-4">
            <img
              src={lesson.url}
              alt={lesson.title}
              className="w-full h-auto rounded-xl shadow"
            />
          </div>
        ) : lesson.contentType === "file-upload" ? (
          <div className="bg-white min-h-[40vh] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-[#C5A059]/10 rounded-2xl flex items-center justify-center mb-4">
              <Download size={28} className="text-[#C5A059]" />
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">
              File Materi
            </h2>
            <p className="text-xs text-gray-400 mb-5">
              Unduh atau buka file materi di bawah.
            </p>
            <a
              href={lesson.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C5A059] text-white text-sm font-bold rounded-xl hover:bg-[#b8913e] transition-colors"
            >
              <Download size={15} /> Buka / Unduh File
            </a>
          </div>
        ) : (
          /* Video: padded so rounded shadow is visible */
          <div className="w-full px-3 pt-3 pb-0">
            <UniversalPlayer
              src={lesson.url}
              contentType={lesson.contentType as any}
              onEnded={() => setIsVideoCompleted(true)}
              onTimeUpdate={(currentTime, duration) => {
                if (duration > 0 && currentTime / duration >= 0.9) {
                  setIsVideoCompleted(true);
                }
              }}
              watermark={lesson.watermark}
              disableSeeking={false}
            />
          </div>
        )}
      </div>

      {/* Below Player — Light Card */}
      {!isLandscape && (
        <div className="flex-1 flex flex-col pb-28">
          {/* Lesson Info */}
          <div className="bg-white mx-3 mt-3 rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="text-base font-bold text-gray-900 leading-tight flex-1">
                {lesson.title}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 mt-0.5 bg-gray-50 px-2 py-1 rounded-full">
                <Clock size={11} />
                <span>{lesson.duration || "10"} mnt</span>
              </div>
            </div>

            {/* Status badge */}
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                isVideoCompleted
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {isVideoCompleted ? (
                <>
                  <CheckCircle size={12} />
                  Materi sudah selesai
                </>
              ) : (
                <>
                  <Play size={11} />
                  Tonton video hingga selesai untuk melanjutkan
                </>
              )}
            </div>
          </div>

          {/* Attachment */}
          {lesson.attachmentUrl && lesson.attachmentName && (
            <div className="bg-white mx-3 mt-3 rounded-2xl border border-gray-100 shadow-sm p-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <LinkIcon size={11} />
                Materi Pendukung
              </h4>
              <a
                href={lesson.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-[#C5A059]/5 border border-gray-100 hover:border-[#C5A059]/30 rounded-xl transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-[#C5A059]/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={16} className="text-[#C5A059]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {lesson.attachmentName}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Klik untuk mengunduh
                  </p>
                </div>
                <Download size={15} className="text-gray-300 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* Navigation */}
          <div className="mx-3 mt-3 grid grid-cols-2 gap-2">
            {prevLesson ? (
              <Link
                href={`/learning/course/${courseId}/lesson/${prevLesson.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-2 hover:border-gray-200 transition-all active:scale-[0.98]"
              >
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <ChevronLeft size={14} className="text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Sebelumnya
                  </p>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {prevLesson.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div />
            )}

            {nextLesson ? (
              <Link
                href={`/learning/course/${courseId}/lesson/${nextLesson.id}`}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex items-center gap-2 justify-end hover:border-gray-200 transition-all active:scale-[0.98] text-right"
              >
                <div className="min-w-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                    Selanjutnya
                  </p>
                  <p className="text-xs font-semibold text-gray-800 truncate">
                    {nextLesson.title}
                  </p>
                </div>
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <ChevronRight size={14} className="text-gray-500" />
                </div>
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar */}
      {!isLandscape && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 px-4 py-3 shadow-lg">
          <button
            onClick={handleMarkComplete}
            disabled={!isVideoCompleted || isUpdating}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
              isVideoCompleted && !isUpdating
                ? "bg-[#C5A059] hover:bg-[#b8913e] text-white shadow-sm active:scale-[0.98]"
                : "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
            }`}
          >
            {isUpdating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : isVideoCompleted ? (
              <>
                <CheckCircle size={16} />
                <span>
                  {nextLesson ? "Selesai & Lanjut" : "Selesaikan Kursus"}
                </span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>Selesaikan video untuk melanjutkan</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Lesson Menu Bottom Sheet */}
      {showLessonMenu && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowLessonMenu(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl border-t border-gray-100 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-gray-900">
                  Navigasi Materi
                </h3>
                <button
                  onClick={() => setShowLessonMenu(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>

              {/* Current Lesson */}
              <div className="bg-[#C5A059]/8 border border-[#C5A059]/20 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#C5A059]/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    {lesson.contentType === "youtube" ? (
                      <Youtube size={18} className="text-[#C5A059]" />
                    ) : (
                      <Play size={18} className="text-[#C5A059]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#C5A059] font-bold uppercase tracking-widest">
                      Materi Saat Ini
                    </p>
                    <h4 className="font-bold text-gray-900 text-sm line-clamp-2">
                      {lesson.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {lesson.duration || "10"} menit
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="space-y-2 mb-3">
                {prevLesson && (
                  <Link
                    href={`/learning/course/${courseId}/lesson/${prevLesson.id}`}
                    onClick={() => setShowLessonMenu(false)}
                    className="flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <ChevronLeft size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                        Sebelumnya
                      </p>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {prevLesson.title}
                      </p>
                    </div>
                  </Link>
                )}
                {nextLesson && (
                  <Link
                    href={`/learning/course/${courseId}/lesson/${nextLesson.id}`}
                    onClick={() => setShowLessonMenu(false)}
                    className="flex items-center gap-3 p-3.5 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                      <ChevronRight size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                        Selanjutnya
                      </p>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                        {nextLesson.title}
                      </p>
                    </div>
                  </Link>
                )}
              </div>

              <Link
                href={`/learning/course/${courseId}`}
                onClick={() => setShowLessonMenu(false)}
                className="flex items-center gap-3 p-3.5 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-all"
              >
                <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <ArrowLeft size={15} className="text-gray-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  Kembali ke Halaman Kursus
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
