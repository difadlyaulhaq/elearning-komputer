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
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-screen bg-brand-gray">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
           <BookOpen className="h-10 w-10 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Akses Terbatas</h2>
        <p className="text-gray-600 mb-6 max-w-xs">Anda harus login terlebih dahulu untuk melihat daftar kursus Anda.</p>
        <Link href="/login" className="bg-brand-black text-white px-8 py-3 rounded-xl font-bold shadow-lg">
          Silakan Login
        </Link>
      </div>
    );
  }

  const enrolledCourses = await getMyEnrolledCourses(user.id);

  return (
    <div className="min-h-screen bg-brand-gray pb-20">
      
      {/* Hero Header */}
      <div className="relative bg-brand-black overflow-hidden mb-8 shadow-md">
        <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #C5A059 1px, transparent 0)`,
            backgroundSize: '40px 40px'
        }}></div>
        <div className="relative container mx-auto px-6 py-12">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-gold to-yellow-700 flex items-center justify-center shadow-lg border-2 border-white/10 text-white">
                <BookCopy size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Kursus Saya</h1>
                <p className="text-brand-gold/80 mt-1 font-medium">Materi yang telah dan sedang Anda pelajari.</p>
              </div>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        {enrolledCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <Link href="/learning/catalog" className="mt-6 inline-flex items-center gap-2 bg-brand-black hover:bg-gray-800 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg hover:shadow-xl">
              Jelajahi Katalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
