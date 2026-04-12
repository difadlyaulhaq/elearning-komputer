import { getCurrentUser } from '@/lib/session';
import { getMyEnrolledCourses } from '@/lib/data/my-courses';
import { CourseCard } from '@/components/learning/CourseCard';
import Link from 'next/link';
import { BookOpen, BookCopy } from 'lucide-react';

export default async function MyCoursesPage() {
  const user = await getCurrentUser();

  if (!user) {
    // This should ideally be handled by middleware, but as a fallback:
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-screen bg-[#F8F9FA]">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
           <BookOpen className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Terbatas</h2>
        <p className="text-gray-600 mb-6 max-w-xs">Anda harus login terlebih dahulu untuk melihat daftar kursus Anda.</p>
        <Link href="/login" className="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-lg">
          Silakan Login
        </Link>
      </div>
    );
  }

  const enrolledCourses = await getMyEnrolledCourses(user.id);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      
      {/* Header - matching catalog style */}
      <div className="bg-white border-b border-gray-200 p-4 md:px-8 md:py-6 hidden md:block">
        <h1 className="text-xl md:text-2xl font-bold text-black">Kursus Saya</h1>
        <p className="text-gray-600 mt-1">Materi yang telah dan sedang Anda pelajari.</p>
      </div>

      <div className="p-4 md:p-8">
        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {enrolledCourses.map((item) => (
              <CourseCard key={item.id} course={item} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-4 bg-white rounded-2xl shadow-sm border border-gray-100 border-dashed">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="mt-2 text-xl font-bold text-gray-900">Anda Belum Punya Kursus</h3>
            <p className="mt-2 text-gray-700 max-w-sm mx-auto">
              Sepertinya Anda belum terdaftar di kursus manapun. Jelajahi katalog untuk memulai perjalanan belajar Anda!
            </p>
            <Link href="/learning/catalog" className="mt-6 inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg hover:shadow-xl">
              Jelajahi Katalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
