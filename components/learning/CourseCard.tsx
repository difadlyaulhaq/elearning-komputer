'use client';

import Link from 'next/link';
import { 
  BookOpen, 
  CheckCircle, 
  Clock, 
  PlayCircle
} from 'lucide-react';
import { Course, Progress } from '@/types';

// Komponen Badge Status
export const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
        <CheckCircle size={12} />
        Selesai
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#C5A059] text-white">
      <Clock size={12} />
      Proses
    </span>
  );
};

// Kartu Kursus — Light Theme (matching catalog design)
export const CourseCard: React.FC<{ course: Omit<Course, 'status'> & Progress & { lastAccessedLessonId?: string } }> = ({ course }) => {
  const isCompleted = course.status === 'completed';
  const isInProgress = course.status === 'in-progress';

  const continueUrl =
    course.status === 'in-progress' && course.lastAccessedLessonId
      ? `/learning/course/${course.id}/lesson/${course.lastAccessedLessonId}`
      : `/learning/course/${course.id}`;

  return (
    <Link href={continueUrl} className="block h-full">
      <div className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 h-full flex flex-col">
        
        {/* Thumbnail Area */}
        <div className="h-40 relative overflow-hidden bg-gray-200">
          {course.thumbnail || course.coverImage ? (
            <img 
              src={course.thumbnail || course.coverImage} 
              alt={course.title} 
              className="w-full h-full object-cover" 
              crossOrigin="anonymous"
              onError={(e) => { e.currentTarget.src = "/logo-alfajr.png"; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <img 
                src="/logo-alfajr.png" 
                alt="Logo Alfajr" 
                className="w-1/2 opacity-30 grayscale"
              />
            </div>
          )}

          {/* Category Badge */}
          <div className="absolute top-2 right-2">
             <span className="px-2 py-1 rounded text-xs font-bold bg-white/90 backdrop-blur-sm text-[#C5A059] shadow-sm">
              {course.categoryName}
             </span>
          </div>

          {/* Status Badge */}
          {isCompleted && (
            <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <CheckCircle size={12} />
              <span>Selesai</span>
            </div>
          )}
          {isInProgress && (
            <div className="absolute top-2 left-2 bg-[#C5A059] text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Clock size={12} />
              <span>Proses</span>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="font-bold text-base text-black mb-2 line-clamp-2" title={course.title}>
            {course.title}
          </h3>
          
          {isInProgress && (
            <div className="mb-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-yellow-600">Dalam Pengerjaan</span>
                <span className="text-xs font-bold text-black">{course.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-[#C5A059] h-1.5 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
            </div>
          )}

          {isCompleted && (
            <div className="flex items-center gap-2 text-green-600 text-xs font-medium bg-green-50 p-2 rounded-lg mb-2">
              <CheckCircle size={14} />
              <span>Kursus telah diselesaikan pada {course.completedAt ? new Date(course.completedAt).toLocaleDateString('id-ID') : '-'}</span>
            </div>
          )}

          <div className="text-xs text-gray-500 line-clamp-2 mb-3 flex-grow">
            {course.description || "Tidak ada deskripsi tersedia."}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <BookOpen size={12} />
              <span>{course.totalVideos || 0} Materi</span>
            </div>
            <span className="text-xs font-bold text-[#C5A059]">
              {isCompleted ? "Lihat Kembali →" : "Lanjutkan →"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
