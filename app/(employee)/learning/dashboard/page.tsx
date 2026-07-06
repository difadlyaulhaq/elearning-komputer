'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  Loader2,
  Shield,
  Users,
  CheckCircle,
  PlayCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Course, Progress } from '@/types';

// --- Warning Popup Component ---
const SecurityWarningPopup = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8 animate-slideUp border border-slate-100">
        <div className="mb-6">
          <div className="w-12 h-12 bg-red-55/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="text-red-500" size={24} />
          </div>
          <h2 className="text-lg md:text-xl font-bold text-slate-950 mb-2">
            Peringatan Keamanan
          </h2>
          <p className="text-slate-600 text-sm">
            Dokumen ini memiliki hak cipta dan dilindungi. Dilarang screenshot
            maupun rekam. Semua kegiatan diawasi, terdata dan ada riwayat.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-3 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/10 touch-button"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
};

// --- Mini Calendar Component for Stats Panel ---
const MiniCalendar = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentDate = today.getDate();

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Get first day of the month and number of days in the month
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-based index
  const totalDays = new Date(year, month + 1, 0).getDate();

  const daysArray = useMemo(() => {
    const arr = [];
    // Add empty slots for offset
    for (let i = 0; i < firstDayIndex; i++) {
      arr.push(null);
    }
    // Add day numbers
    for (let i = 1; i <= totalDays; i++) {
      arr.push(i);
    }
    return arr;
  }, [firstDayIndex, totalDays]);

  const daysOfWeek = ['Se', 'Se', 'Ra', 'Ka', 'Ju', 'Sa', 'Mi'];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <CalendarIcon size={16} className="text-sky-600" />
          <span>{monthNames[month]} {year}</span>
        </h4>
        <div className="flex gap-1">
          <button className="p-1 hover:bg-slate-50 rounded text-slate-400" disabled>
            <ChevronLeft size={14} />
          </button>
          <button className="p-1 hover:bg-slate-50 rounded text-slate-400" disabled>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 text-center text-xs">
        {daysOfWeek.map((day, idx) => (
          <div key={idx} className="font-semibold text-slate-400 pb-1">
            {day}
          </div>
        ))}
        {daysArray.map((day, idx) => {
          const isToday = day === currentDate;
          return (
            <div key={idx} className="flex justify-center items-center h-6">
              {day ? (
                <span
                  className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] font-medium transition-all ${
                    isToday
                      ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-600/10'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {day}
                </span>
              ) : (
                <span />
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-slate-400 text-center mt-3 pt-2 border-t border-slate-100">
        Hari ini: {currentDate} {monthNames[month]}
      </div>
    </div>
  );
};

// --- Main Employee Dashboard Component ---
const EmployeeDashboardPage = () => {
  const { user, isLoading: isAuthLoading, authFetch } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [ongoingCourses, setOngoingCourses] = useState<
    (Omit<Course, 'status'> & Progress)[]
  >([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [showRoleChoice, setShowRoleChoice] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed'>('in-progress');
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => window.innerWidth < 768;
    setIsMobile(checkMobile());
    const handler = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const handleWarningDismiss = () => {
    setShowWarning(false);
    const role = sessionStorage.getItem('loggedInUserRole');
    if (role === 'admin') {
      setShowRoleChoice(true);
    } else {
      sessionStorage.removeItem('showLoginWarning');
    }
  };

  const handleChooseRole = (role: 'admin' | 'employee') => {
    setShowRoleChoice(false);
    setTimeout(() => {
      sessionStorage.removeItem('showLoginWarning');
      if (role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/learning/dashboard');
      }
    }, 500);
  };

  useEffect(() => {
    const shouldShowWarning = sessionStorage.getItem('showLoginWarning');
    if (shouldShowWarning) setShowWarning(true);
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setIsLoadingData(true);
      try {
        const [coursesRes, historyRes] = await Promise.all([
          authFetch('/api/learning/my-courses'),
          authFetch('/api/learning/history'),
        ]);

        const coursesData = await coursesRes.json();
        if (coursesData.success) {
          setCourses(coursesData.data);
        }

        const historyData = await historyRes.json();
        if (historyData.success) {
          const allUserCourses = historyData.data as (Omit<Course, 'status'> & Progress)[];
          
          // In progress filter
          const ongoing = allUserCourses.filter(
            (c) => c.status === 'in-progress'
          );
          setOngoingCourses(ongoing);

          const progressMap = allUserCourses.reduce(
            (acc, p) => {
              acc[p.id] = p;
              return acc;
            },
            {} as Record<string, Progress>
          );
          setProgress(progressMap);
        }
      } catch (error) {
        console.error('Gagal mengambil data materi:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (user) {
      fetchData();
    } else if (!isAuthLoading) {
      setIsLoadingData(false);
    }
  }, [user, isAuthLoading, authFetch]);

  // Statistics calculation
  const stats = useMemo(() => {
    const inProgressCount = ongoingCourses.length;
    const completedCount = Object.values(progress).filter(p => p.status === 'completed').length;
    const totalLessonsCompleted = Object.values(progress).reduce(
      (acc, p) => acc + (p.completedLessons?.length || 0), 0
    );
    return {
      inProgressCount,
      completedCount,
      totalLessonsCompleted
    };
  }, [ongoingCourses, progress]);

  // Group user's courses by category for In Progress tab
  const groupedCourses = useMemo(() => {
    // Merge general assigned courses with progress records
    const allEnrolledCourses = courses.map(course => {
      const progressData = progress[course.id] || {
        status: 'not-started',
        progress: 0,
        completedLessons: []
      };
      return {
        ...course,
        status: progressData.status,
        progress: progressData.progress,
        completedLessons: progressData.completedLessons
      };
    });

    const groups: Record<string, typeof allEnrolledCourses> = {};
    allEnrolledCourses.forEach(course => {
      if (activeTab === 'in-progress' && course.status === 'completed') return;
      if (activeTab === 'completed' && course.status !== 'completed') return;

      const catName = course.categoryName || 'Lainnya';
      if (!groups[catName]) {
        groups[catName] = [];
      }
      groups[catName].push(course);
    });

    return groups;
  }, [courses, progress, activeTab]);

  // Helper to find the next incomplete lesson
  const getNextLessonInfo = (course: any) => {
    if (!course.sections || course.sections.length === 0) return null;
    const completed = course.completedLessons || [];
    for (const section of course.sections) {
      if (!section.lessons || section.lessons.length === 0) continue;
      for (const lesson of section.lessons) {
        if (!completed.includes(lesson.id)) {
          return lesson;
        }
      }
    }
    // Fallback: first lesson
    return course.sections[0].lessons[0];
  };

  const hasCoursesInActiveTab = useMemo(() => {
    return Object.keys(groupedCourses).length > 0;
  }, [groupedCourses]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold bg-slate-50 min-h-screen flex items-center justify-center">
        Akses ditolak. Silakan login terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SecurityWarningPopup isOpen={showWarning} onClose={handleWarningDismiss} />

      {/* Coursera-style Hero Greeting Banner */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-8 md:py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-xs font-bold text-sky-600 tracking-wider uppercase bg-sky-50 px-2.5 py-1 rounded-full">
              Learning Portal
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2 leading-tight">
              Selamat datang kembali, {user?.name}!
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Siap untuk mempelajari hal baru dan meningkatkan potensimu hari ini? 🌟
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/learning/catalog"
              className="flex items-center gap-1.5 bg-sky-600 text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-sky-700 transition-all shadow-md shadow-sky-600/10 active:scale-95"
            >
              <span>Jelajahi Katalog</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL: In Progress / Completed tabs and list (Coursera Style) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Tabs Controller */}
            <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-xs">
              <button
                onClick={() => setActiveTab('in-progress')}
                className={`flex-1 py-3 text-center text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'in-progress'
                    ? 'bg-sky-50 text-sky-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sedang Diikuti ({courses.length - stats.completedCount})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`flex-1 py-3 text-center text-sm font-bold rounded-lg transition-all ${
                  activeTab === 'completed'
                    ? 'bg-sky-50 text-sky-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Telah Selesai ({stats.completedCount})
              </button>
            </div>

            {isLoadingData ? (
              <div className="flex justify-center items-center py-20 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
              </div>
            ) : !hasCoursesInActiveTab ? (
              <div className="text-center py-16 px-6 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="text-slate-400" size={24} />
                </div>
                <h3 className="font-bold text-slate-800 text-base mb-1">
                  {activeTab === 'in-progress' ? 'Tidak ada kursus yang aktif' : 'Belum ada kursus yang diselesaikan'}
                </h3>
                <p className="text-slate-500 text-sm max-w-sm mx-auto mb-5">
                  {activeTab === 'in-progress'
                    ? 'Kamu tidak memiliki kelas aktif yang sedang berjalan. Mulai belajar sekarang!'
                    : 'Selesaikan kursus pertama Anda untuk mendapatkan rekam riwayat di sini.'}
                </p>
                <Link
                  href="/learning/catalog"
                  className="inline-flex items-center gap-1 bg-sky-50 text-sky-600 hover:bg-sky-100 font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  Jelajahi Katalog Materi
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(groupedCourses).map(([category, catCourses]) => (
                  <div key={category} className="space-y-4">
                    
                    {/* Category Title */}
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                      <span className="text-lg font-extrabold text-slate-800 tracking-tight">
                        {category}
                      </span>
                      <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
                        {catCourses.length} Kelas
                      </span>
                    </div>

                    {/* Courses Rows */}
                    <div className="space-y-4">
                      {catCourses.map(course => {
                        const isCompleted = course.status === 'completed';
                        const isInProgress = course.status === 'in-progress';
                        const nextLesson = getNextLessonInfo(course);
                        const progressPercent = course.progress || 0;

                        return (
                          <div
                            key={course.id}
                            className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between items-stretch gap-6"
                          >
                            {/* Left: Course Info & Progress Bar */}
                            <div className="flex-1 flex flex-col justify-between min-w-0">
                              <div>
                                <h3 className="font-extrabold text-slate-900 text-base md:text-lg mb-1.5 leading-tight hover:text-sky-600 transition-colors">
                                  <Link href={`/learning/course/${course.id}`}>{course.title}</Link>
                                </h3>
                                <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">
                                  {course.description}
                                </p>
                              </div>

                              {/* Progress section */}
                              <div>
                                {isCompleted ? (
                                  <div className="flex items-center gap-2 text-green-600 text-xs font-semibold">
                                    <CheckCircle size={14} />
                                    <span>Telah Selesai 100%</span>
                                  </div>
                                ) : isInProgress ? (
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-semibold text-sky-600">Dalam Pengerjaan</span>
                                      <span className="font-bold text-slate-800">{progressPercent}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                      <div
                                        className="bg-sky-600 h-1.5 rounded-full transition-all duration-500"
                                        style={{ width: `${progressPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                                    Belum Dimulai
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Divider line for mobile */}
                            <div className="md:hidden border-t border-slate-100 my-1" />

                            {/* Right: Next Lesson info & Resume Button */}
                            <div className="w-full md:w-80 flex flex-col justify-between items-stretch md:items-end gap-4 shrink-0 text-left md:text-right">
                              {!isCompleted && nextLesson ? (
                                <div className="space-y-1 min-w-0">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Materi Selanjutnya
                                  </p>
                                  <h4 className="font-bold text-slate-800 text-sm line-clamp-1">
                                    {nextLesson.title}
                                  </h4>
                                  <p className="text-xs text-slate-500 flex items-center md:justify-end gap-1">
                                    <Clock size={12} className="text-slate-400" />
                                    <span>
                                      {nextLesson.contentType === 'youtube' ? 'Video' : nextLesson.contentType === 'text' ? 'Artikel' : 'File'} • {nextLesson.duration || 10} menit
                                    </span>
                                  </p>
                                </div>
                              ) : isCompleted ? (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Hasil Pembelajaran
                                  </p>
                                  <h4 className="font-bold text-slate-800 text-sm">
                                    Semua materi diselesaikan!
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    Progres Belajar Terawat Baik
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Syllabus
                                  </p>
                                  <h4 className="font-bold text-slate-800 text-sm">
                                    {course.totalVideos || 0} Materi Pembelajaran
                                  </h4>
                                </div>
                              )}

                              <div className="flex md:justify-end gap-2 w-full">
                                {isCompleted ? (
                                  <Link
                                    href={`/learning/course/${course.id}`}
                                    className="flex-1 md:flex-initial text-center py-2.5 px-5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all active:scale-95"
                                  >
                                    Tinjau Materi
                                  </Link>
                                ) : nextLesson ? (
                                  <Link
                                    href={`/learning/course/${course.id}/lesson/${nextLesson.id}`}
                                    className="flex-1 md:flex-initial text-center py-2.5 px-5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/10 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                  >
                                    <PlayCircle size={14} />
                                    <span>{isInProgress ? 'Lanjutkan' : 'Mulai Belajar'}</span>
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/learning/course/${course.id}`}
                                    className="flex-1 md:flex-initial text-center py-2.5 px-5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-md shadow-sky-600/10 transition-all active:scale-95"
                                  >
                                    Buka Kursus
                                  </Link>
                                )}
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>

                  </div>
                ))}
              </div>
            )}

          </div>

          {/* RIGHT PANEL: Calendar and Statistics Card */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Statistics Dashboard widget */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <h4 className="font-bold text-slate-900 text-sm mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <TrendingUp size={16} className="text-sky-600" />
                <span>Statistik Belajar Anda</span>
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Diikuti
                  </p>
                  <p className="text-xl md:text-2xl font-extrabold text-slate-950 mt-1">
                    {courses.length}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Kelas Total
                  </p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Selesai
                  </p>
                  <p className="text-xl md:text-2xl font-extrabold text-green-600 mt-1">
                    {stats.completedCount}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Kelas Lulus
                  </p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                    Materi
                  </p>
                  <p className="text-xl md:text-2xl font-extrabold text-sky-600 mt-1">
                    {stats.totalLessonsCompleted}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Bab Selesai
                  </p>
                </div>
              </div>

              <div className="mt-5 p-3.5 bg-sky-50 rounded-xl flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                  <Award className="text-sky-600" size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-xs">Konsistensi Kunci Sukses!</h5>
                  <p className="text-slate-600 text-[10px] mt-0.5 leading-relaxed">
                    Selesaikan minimal 1 materi setiap hari untuk menjaga fokus belajarmu.
                  </p>
                </div>
              </div>
            </div>

            {/* Monthly Calendar widget */}
            <MiniCalendar />

            {/* Recently Completed widget */}
            {stats.completedCount > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h4 className="font-bold text-slate-900 text-sm mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Kursus Baru Saja Selesai</span>
                </h4>
                <div className="space-y-3">
                  {courses
                    .filter(c => progress[c.id]?.status === 'completed')
                    .slice(0, 3)
                    .map(course => (
                      <Link 
                        key={course.id} 
                        href={`/learning/course/${course.id}`}
                        className="block p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200/50 transition-colors group"
                      >
                        <h5 className="font-bold text-slate-800 text-xs line-clamp-1 group-hover:text-sky-600 transition-colors">
                          {course.title}
                        </h5>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Selesai pada: {progress[course.id]?.completedAt ? new Date(progress[course.id].completedAt!).toLocaleDateString('id-ID') : 'Baru-baru ini'}
                        </p>
                      </Link>
                    ))}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Modal Pilihan Role */}
      {showRoleChoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div
            className={`${isMobile ? 'p-6' : 'p-8'} bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center animate-slideUp border border-slate-100`}
          >
            <div className="mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="text-sky-600" size={24} />
              </div>
              <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-extrabold text-slate-900 mb-2`}>
                Login sebagai Admin
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Anda memiliki akses admin. Pilih tampilan dasbor yang ingin Anda buka.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleChooseRole('admin')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-sky-600 text-white font-bold rounded-xl hover:bg-sky-700 transition-colors shadow-lg shadow-sky-600/10 touch-button text-sm"
              >
                <Shield className="text-white" size={18} />
                Buka Dasbor Admin
              </button>
              <button
                onClick={() => handleChooseRole('employee')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-slate-50 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 touch-button text-sm"
              >
                <Users size={18} className="text-slate-500" />
                Buka sebagai Pegawai
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboardPage;