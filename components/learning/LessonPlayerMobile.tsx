"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Maximize2,
  Minimize2,
  Smartphone,
  Monitor,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import UniversalPlayer from "./UniversalPlayer";
import { LessonSkeleton } from "./LessonSkeleton";
import { getIsNativeApp } from "@/lib/native-detection";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenLandscape, setIsFullscreenLandscape] = useState(true);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // ─── Fullscreen Management ──────────────────────────────────────────
  const enterFullscreen = useCallback(async () => {
    const container = videoContainerRef.current;
    if (!container) return;

    try {
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        await (container as any).webkitRequestFullscreen();
      }

      // Try to lock to landscape by default when entering fullscreen
      try {
        if ((window.screen as any).orientation?.lock) {
          await (window.screen as any).orientation.lock("landscape");
          setIsFullscreenLandscape(true);
        }
      } catch {
        // Orientation lock may not be supported; that's ok
      }

      setIsFullscreen(true);
    } catch (error) {
      console.error("Fullscreen failed:", error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }

      // Unlock orientation when exiting
      try {
        if ((window.screen as any).orientation?.unlock) {
          (window.screen as any).orientation.unlock();
        }
      } catch {
        // Ignore
      }

      setIsFullscreen(false);
      setIsFullscreenLandscape(true);
    } catch (error) {
      console.error("Exit fullscreen failed:", error);
    }
  }, []);

  const toggleFullscreenOrientation = useCallback(async () => {
    try {
      if ((window.screen as any).orientation?.lock) {
        if (isFullscreenLandscape) {
          await (window.screen as any).orientation.lock("portrait");
          setIsFullscreenLandscape(false);
        } else {
          await (window.screen as any).orientation.lock("landscape");
          setIsFullscreenLandscape(true);
        }
      } else {
        toast.error("Putar perangkat Anda untuk mengubah tampilan.");
      }
    } catch (error) {
      console.error("Orientation toggle failed:", error);
      toast.error("Putar perangkat Anda untuk mengubah tampilan.");
    }
  }, [isFullscreenLandscape]);

  // Listen for fullscreen change events (e.g. user presses back button)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen) {
        setIsFullscreenLandscape(true);
        try {
          if ((window.screen as any).orientation?.unlock) {
            (window.screen as any).orientation.unlock();
          }
        } catch {
          // Ignore
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

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
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      {!isLandscape && !isFullscreen && (
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
        className={`bg-[#F8F9FA] w-full ${
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
          <div
            ref={videoContainerRef}
            className={`w-full relative ${
              isLandscape
                ? "h-screen"
                : isFullscreen
                  ? "h-screen bg-black flex items-center justify-center"
                  : "px-3 pt-3 pb-0"
            }`}
          >
            {/* Local Toaster for Fullscreen notifications */}
            <Toaster position="top-center" />
            
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

            {/* ── Portrait non-fullscreen: Fullscreen button ── */}
            {!isLandscape && !isFullscreen && (lesson.contentType === "youtube" || lesson.contentType === "video-upload") && (
              <button
                onClick={enterFullscreen}
                className="absolute z-30 top-6 right-6 w-9 h-9 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-sm text-white rounded-full transition-all border border-white/20 shadow-lg"
                title="Fullscreen"
              >
                <Maximize2 size={16} />
              </button>
            )}

            {/* ── Fullscreen overlay controls ── */}
            {isFullscreen && (
              <>
                {/* Top-right controls: orientation toggle + exit fullscreen */}
                <div 
                  className="absolute right-4 z-40 flex items-center gap-2"
                  style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
                >
                  {/* Orientation toggle */}
                  <button
                    onClick={toggleFullscreenOrientation}
                    className="flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-xl transition-all border border-white/20 shadow-lg"
                    title={isFullscreenLandscape ? "Mode Potret" : "Mode Lanskap"}
                  >
                    {isFullscreenLandscape ? (
                      <>
                        <Smartphone size={16} />
                        <span className="text-xs font-semibold">Potret</span>
                      </>
                    ) : (
                      <>
                        <Monitor size={16} />
                        <span className="text-xs font-semibold">Lanskap</span>
                      </>
                    )}
                  </button>

                  {/* Exit fullscreen */}
                  <button
                    onClick={exitFullscreen}
                    className="w-10 h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 backdrop-blur-md text-white rounded-xl transition-all border border-white/20 shadow-lg"
                    title="Keluar Fullscreen"
                  >
                    <Minimize2 size={18} />
                  </button>
                </div>

                {/* Bottom controls bar */}
                <div className="absolute inset-x-0 bottom-0 z-40 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-4 pointer-events-auto">
                    <button
                      onClick={() => {
                        if (prevLesson) router.push(`/learning/course/${courseId}/lesson/${prevLesson.id}`);
                      }}
                      disabled={!prevLesson}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white disabled:opacity-30"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <div className="text-white">
                      <h4 className="text-xs font-bold line-clamp-1">{lesson.title}</h4>
                      <p className="text-[10px] opacity-70">Sedang diputar</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pointer-events-auto">
                    <button
                      onClick={handleMarkComplete}
                      disabled={!isVideoCompleted || isUpdating}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isVideoCompleted && !isUpdating
                          ? "bg-[#C5A059] text-white"
                          : "bg-white/10 text-white/50 cursor-not-allowed"
                      }`}
                    >
                      {isUpdating ? "..." : nextLesson ? "Lanjut →" : "Selesai ✓"}
                    </button>
                    <button
                      onClick={() => {
                        if (nextLesson) router.push(`/learning/course/${courseId}/lesson/${nextLesson.id}`);
                      }}
                      disabled={!nextLesson}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white disabled:opacity-30"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── Auto landscape (no fullscreen API) overlay controls ── */}
            {isLandscape && !isFullscreen && (
              <div className="absolute inset-x-0 bottom-0 z-30 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                   <button
                    onClick={() => {
                      if (prevLesson) router.push(`/learning/course/${courseId}/lesson/${prevLesson.id}`);
                    }}
                    disabled={!prevLesson}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white disabled:opacity-30"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <div className="text-white">
                    <h4 className="text-xs font-bold line-clamp-1">{lesson.title}</h4>
                    <p className="text-[10px] opacity-70">Sedang diputar</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pointer-events-auto">
                  <button
                    onClick={handleMarkComplete}
                    disabled={!isVideoCompleted || isUpdating}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isVideoCompleted && !isUpdating
                        ? "bg-[#C5A059] text-white"
                        : "bg-white/10 text-white/50 cursor-not-allowed"
                    }`}
                  >
                    {isUpdating ? "..." : nextLesson ? "Lanjut →" : "Selesai ✓"}
                  </button>
                  <button
                    onClick={() => {
                      if (nextLesson) router.push(`/learning/course/${courseId}/lesson/${nextLesson.id}`);
                    }}
                    disabled={!nextLesson}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white disabled:opacity-30"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Below Player — Light Card */}
      {!isLandscape && !isFullscreen && (
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
                href={getIsNativeApp() ? `/learning/view-file?url=${encodeURIComponent(lesson.attachmentUrl)}&name=${encodeURIComponent(lesson.attachmentName)}` : lesson.attachmentUrl}
                target={getIsNativeApp() ? undefined : '_blank'}
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
      {!isLandscape && !isFullscreen && (
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
