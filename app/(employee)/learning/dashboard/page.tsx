'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  Loader2,
  Target,
  Sparkles,
  Shield,
  Users,
  CheckCircle,
  PlayCircle,
  Clock,
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8 animate-slideUp">
        <div className="mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="text-red-500" size={24} />
          </div>
          <h2 className="text-lg md:text-2xl font-bold text-black mb-2">
            Peringatan Keamanan
          </h2>
          <p className="text-gray-700 text-sm">
            Dokumen ini memiliki hak cipta dan dilindungi. Dilarang screenshot
            maupun rekam. Semua kegiatan di awasi, terdata dan ada riwayat.
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-3 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-lg touch-button"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
};

// --- Inline Course Card for Dashboard (light theme, matching catalog) ---
const DashboardCourseCard: React.FC<{ course: Course; progress?: { status?: string; progress?: number } }> = ({ course, progress }) => {
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in-progress';
  
  const thumbnailUrl = course.thumbnail || course.coverImage || '/logo-alfajr.png';
  const displayThumbnail = (thumbnailUrl.includes('firebasestorage.googleapis.com'))
    ? `/api/video/stream?url=${encodeURIComponent(thumbnailUrl)}`
    : thumbnailUrl;

  return (
    <Link href={`/learning/course/${course.id}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col">
        <div className="h-40 bg-gray-200 relative">
          <img
            src={displayThumbnail}
            alt={course.title}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
            onError={(e) => { 
              if (!e.currentTarget.src.includes('logo-alfajr.png')) {
                e.currentTarget.src = "/logo-alfajr.png"; 
              }
            }}
          />
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-[#C5A059] shadow-sm">
            {course.categoryName}
          </div>
          {isCompleted && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle size={12} />
              <span>Selesai</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-base text-black mb-2 line-clamp-2" title={course.title}>{course.title}</h3>
          
          {isInProgress && (
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-yellow-600">Dalam Pengerjaan</span>
                <span className="text-xs font-bold text-black">{progress?.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-[#C5A059] h-1.5 rounded-full" style={{ width: `${progress?.progress || 0}%` }} />
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-grow">{course.description}</p>
          <div className="text-xs text-gray-500 flex items-center pt-2 border-t border-gray-100">
            <BookOpen size={12} className="mr-1.5"/> {course.totalVideos || 0} Materi
          </div>
        </div>
      </div>
    </Link>
  );
};

// --- Main Component ---
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
        // Gunakan authFetch — otomatis kirim Authorization header
        // sehingga berfungsi di web (cookie) dan Capacitor native (header)
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
          const allUserCourses = historyData.data as (Omit<Course, 'status'> &
            Progress)[];
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

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 text-brand-gold animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center text-red-500">
        Akses ditolak. Silakan login terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <SecurityWarningPopup isOpen={showWarning} onClose={handleWarningDismiss} />

      {/* Header - Light, matching catalog */}
      <div className="bg-white border-b border-gray-200 p-4 md:px-8 md:py-6">
        <h1 className="text-xl md:text-2xl font-bold text-black">
          Assalamualaikum, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">Terus tingkatkan potensimu hari ini 🌟</p>
      </div>

      <div className="p-4 md:p-8">
        <div className="space-y-8">
          {/* Ongoing Courses */}
          {isLoadingData ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-12 h-12 text-[#C5A059] animate-spin" />
            </div>
          ) : (
            <>
              {ongoingCourses.length > 0 && (
                <div>
                  <div className="mb-4">
                    <h2 className="text-lg font-bold text-black">Lanjutkan Belajar</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Selesaikan kursus yang sedang kamu ikuti
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {ongoingCourses.map((course) => (
                      <DashboardCourseCard key={course.id} course={course as any} progress={course} />
                    ))}
                  </div>
                </div>
              )}

              {/* Explore Section */}
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-black">Jelajahi Kursus Lainnya</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Temukan {courses.length}+ kursus berkualitas untukmu
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {courses
                    .filter(c => !ongoingCourses.some(oc => oc.id === c.id))
                    .slice(0, 8)
                    .map((course) => {
                      const progressData = progress[course.id] || {
                        status: 'not-started',
                        progress: 0,
                      };
                      return <DashboardCourseCard key={course.id} course={course} progress={progressData} />;
                    })}
                </div>
                <div className="text-center mt-6">
                  <Link
                    href="/learning/catalog"
                    className="px-8 py-3 bg-[#C5A059] text-white rounded-xl hover:bg-[#b8913e] transition-all font-semibold shadow-sm"
                  >
                    Lihat Semua Kursus
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Pilihan Role */}
      {showRoleChoice && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div
            className={`${isMobile ? 'p-6' : 'p-8'} bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center animate-slideUp`}
          >
            <div className="mb-6">
              <div className="w-12 h-12 bg-[#C5A059]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="text-[#C5A059]" size={24} />
              </div>
              <h2
                className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-black mb-2`}
              >
                Login sebagai Admin
              </h2>
              <p className="text-gray-600 text-sm">
                Anda memiliki akses admin. Pilih tampilan dasbor yang ingin
                Anda buka.
              </p>
            </div>
            <div className="space-y-3 sm:space-y-4">
              <button
                onClick={() => handleChooseRole('admin')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-[#C5A059] text-black font-bold rounded-lg hover:bg-[#B08F4A] transition-colors shadow-lg touch-button"
              >
                <Shield className="text-black" size={20} />
                Buka Dasbor Admin
              </button>
              <button
                onClick={() => handleChooseRole('employee')}
                className="w-full flex items-center justify-center gap-3 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-colors border border-gray-300 touch-button"
              >
                <Users size={20} />
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