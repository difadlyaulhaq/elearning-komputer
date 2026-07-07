'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, BookOpen, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Course, Category, Progress } from '@/types';

// --- Helper Components ---
const CourseCard: React.FC<{ course: Course; progress?: Progress }> = ({ course, progress }) => {
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in-progress';

  return (
    <Link href={`/learning/course/${course.id}`} key={course.id}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col">
        <div className="h-40 bg-gray-200 relative">
          <img 
            src={course.thumbnail || course.coverImage || '/LOGO INTER.png'} 
            alt={course.title} 
            className="w-full h-full object-cover" 
            onError={(e) => { e.currentTarget.src = "/LOGO INTER.png"; }}
          />
          <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-[#0066FF] shadow-sm">
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
                <span className="text-xs font-bold text-black">{progress.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: `${progress.progress}%` }} />
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
const CourseCatalogPage = () => {
  const { user, isLoading: isAuthLoading, authFetch } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const fetches = [
          authFetch('/api/admin/courses'),
          authFetch('/api/admin/categories'),
        ];

        // Only fetch progress if user is logged in
        if (user?.id) {
          fetches.push(authFetch(`/api/progress/${user.id}`));
        }
        
        const responses = await Promise.all(fetches);
        const [coursesRes, catRes, progressRes] = responses;

        const coursesData = await coursesRes.json();
        const catData = await catRes.json();

        if (coursesData.success) {
          setCourses(coursesData.data.filter((c: Course) => c.status === 'active'));
        }
        if (catData.success) {
          setCategories(catData.data);
        }

        if (progressRes) {
          const progressData = await progressRes.json();
          if (progressData.success) {
            const progressMap = progressData.data.reduce((acc: Record<string, Progress>, p: Progress) => {
              acc[p.courseId] = p;
              return acc;
            }, {});
            setProgress(progressMap);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Wait until auth state is resolved before fetching
    if (!isAuthLoading) {
        fetchData();
    }
  }, [user, isAuthLoading, authFetch]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesCategory = activeCategory === 'all' || course.categoryName === activeCategory;
      const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [courses, activeCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 md:px-8 md:py-6 hidden md:block">
        <h1 className="text-xl md:text-2xl font-bold text-black">Katalog Materi</h1>
        <p className="text-gray-600 mt-1">Temukan pengetahuan dan keahlian baru untuk menunjang karirmu.</p>
      </div>

      <div className="p-4 md:p-8">
        {/* Filter and Search */}
        <div className="mb-8">
            <div className="relative mb-4 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Cari judul kursus..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0066FF] outline-none text-black"
                />
            </div>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveCategory('all')}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                        activeCategory === 'all' ? 'bg-[#0066FF] text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    Semua
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                            activeCategory === cat.name ? 'bg-[#0066FF] text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-[#0066FF] animate-spin" />
          </div>
        ) : (
            filteredCourses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                {filteredCourses.map((course) => (
                    <CourseCard key={course.id} course={course} progress={progress[course.id]} />
                ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <h3 className="text-lg font-semibold">Tidak ada kursus yang ditemukan</h3>
                    <p>Coba ubah kata kunci pencarian atau filter kategori Anda.</p>
                </div>
            )
        )}
      </div>
    </div>
  );
};

export default CourseCatalogPage;