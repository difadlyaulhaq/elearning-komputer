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
} from 'lucide-react';
import { Course, Progress } from '@/types';
import { CourseCard } from '@/components/learning/CourseCard';

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
    <div className="min-h-screen bg-brand-gray">
      <SecurityWarningPopup isOpen={showWarning} onClose={handleWarningDismiss} />

      {/* Hero Header */}
      <div className="relative bg-brand-black overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, #C5A059 1px, transparent 0)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>
        <div className="relative p-4 md:px-8 md:py-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-gold to-yellow-700 flex items-center justify-center shadow-lg border-2 border-white/20">
              <Sparkles className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Assalamualaikum, {user?.name}!
              </h1>
              <p className="text-brand-gold mt-1">
                Terus tingkatkan potensimu hari ini 🌟
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 -mt-6">
        <div className="space-y-8">
          {/* Ongoing Courses */}
          {isLoadingData ? (
            <div className="bg-white rounded-2xl shadow-lg border p-6 text-center">
              <Loader2 className="mx-auto animate-spin text-brand-gold" />
            </div>
          ) : (
            ongoingCourses.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-xl font-bold text-black">
                    Lanjutkan Belajar
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Selesaikan kursus yang sedang kamu ikuti
                  </p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ongoingCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </div>
            )
          )}

          {/* Explore Section */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-brand-gold to-yellow-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-black">
                  Jelajahi Kursus Lainnya
                </h3>
                <p className="text-sm text-black/70 mt-1">
                  Temukan {courses.length}+ kursus berkualitas untukmu
                </p>
              </div>
              <Target className="text-white/80" size={24} />
            </div>
            {isLoadingData ? (
              <div className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-brand-gold animate-spin mx-auto mb-3" />
                <p className="text-gray-500">Memuat kursus...</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.slice(0, 6).map((course) => {
                    const progressData = progress[course.id] || {
                      status: 'not-started',
                      progress: 0,
                    };
                    const combinedData = { ...course, ...progressData };
                    return <CourseCard key={course.id} course={combinedData} />;
                  })}
                </div>
                <div className="text-center mt-6">
                  <Link
                    href="/learning/catalog"
                    className="px-8 py-3 bg-gradient-to-r from-brand-gold to-yellow-600 text-black rounded-xl hover:shadow-lg transition-all font-semibold"
                  >
                    Lihat Semua Kursus
                  </Link>
                </div>
              </div>
            )}
          </div>
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
