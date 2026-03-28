import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BookOpen, Clock, PlayCircle, ChevronRight, ArrowLeft } from "lucide-react";
import { getCoursePageData } from "@/lib/data/courses";
import Image from "next/image";
import { getYouTubeThumbnail } from "@/lib/utils";
import { getCurrentUser } from "@/lib/session";
import { adminDb } from "@/lib/firebase/admin";
import { LessonAttachment } from "@/components/learning/LessonAttachment";

export default async function CourseDetailPage({ 
  params 
}: { 
  params: Promise<{ courseId: string }> 
}) {
  const { courseId } = await params;
  const [course, user] = await Promise.all([
    getCoursePageData(courseId),
    getCurrentUser()
  ]);

  if (!course) {
    notFound();
  }

  // Enrollment Check
  if (user?.role !== 'admin') {
    let isEnrolled = false;
    
    // Check direct user enrollment
    if (course.enrolledUserIds?.includes(user?.id || '')) {
      isEnrolled = true;
    } 
    
    // Check division enrollment
    if (!isEnrolled && user?.division && adminDb) {
      const divisionSnapshot = await adminDb.collection('divisions')
        .where('name', '==', user.division)
        .limit(1)
        .get();
        
      if (!divisionSnapshot.empty) {
        const divisionId = divisionSnapshot.docs[0].id;
        if (course.enrolledDivisionIds?.includes(divisionId)) {
          isEnrolled = true;
        }
      }
    }

    if (!isEnrolled) {
      redirect('/learning/dashboard');
    }
  }

  const firstLessonId = course.sections?.[0]?.lessons?.[0]?.id;
  const totalLessons = course.sections?.reduce((acc, section) => 
    acc + (section.lessons?.length || 0), 0
  ) || 0;

  const getFirstYouTubeThumbnail = () => {
    if (course.thumbnail) return course.thumbnail;
    if (course.coverImage) return course.coverImage;
    
    if (course.sections) {
      for (const section of course.sections) {
        if (section.lessons) {
          for (const lesson of section.lessons) {
            if (lesson.contentType === 'youtube' && lesson.url) {
              return getYouTubeThumbnail(lesson.url);
            }
          }
        }
      }
    }
    return '/logo-alfajr.png';
  };

  const thumbnailSrc = getFirstYouTubeThumbnail() || '/logo-alfajr.png';

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Link 
            href="/learning/dashboard" 
            className="flex items-center text-gray-600 hover:text-black"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-bold text-black truncate max-w-[70%] text-center">
            {course.title}
          </h1>
          <div className="w-8"></div>
        </div>
      </div>

      {/* Mobile Hero Banner */}
      <div className="md:hidden relative h-48 bg-gray-800">
        <Image
          src={thumbnailSrc}
          alt={course.title}
          fill
          className="object-cover opacity-40"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-4">
          <span className="bg-[#C5A059] text-black text-xs font-bold px-2 py-1 rounded mb-2 inline-block">
            {course.categoryName}
          </span>
          <h1 className="text-xl font-bold text-white mb-1 line-clamp-2">
            {course.title}
          </h1>
        </div>
      </div>

      {/* Desktop Hero Banner */}
      <div className="hidden md:block relative h-64 md:h-80 bg-gray-800">
        <Image
          src={thumbnailSrc}
          alt={course.title}
          fill
          className="object-cover opacity-40"
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 p-8">
          <span className="bg-[#C5A059] text-black text-xs font-bold px-2 py-1 rounded mb-2 inline-block">
            {course.categoryName}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {course.title}
          </h1>
          <p className="text-gray-200 text-sm max-w-3xl">
            {course.description}
          </p>
        </div>
      </div>

      {/* Mobile Action Buttons */}
      <div className="md:hidden p-4 space-y-3">
        {firstLessonId ? (
          <Link 
            href={`/learning/course/${course.id}/lesson/${firstLessonId}`} 
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#C5A059] text-black rounded-lg font-bold shadow-lg hover:bg-amber-500 transition-colors"
          >
            <PlayCircle size={20} />
            Mulai Belajar Sekarang
          </Link>
        ) : (
          <div className="w-full text-center py-3 bg-gray-300 text-gray-600 rounded-lg font-bold">
            Materi Belum Tersedia
          </div>
        )}

        {/* Course Stats - Mobile */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Materi</p>
                <p className="text-lg font-bold text-black">{totalLessons}</p>
              </div>
              <BookOpen size={20} className="text-[#C5A059]" />
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Level</p>
              <p className="text-lg font-bold text-black capitalize">{course.level || 'Basic'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* About Course - Mobile */}
          <div className="md:hidden bg-white p-4 rounded-xl border shadow-sm mb-4">
            <h2 className="text-lg font-bold text-black mb-3">Tentang Kursus Ini</h2>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {course.description}
            </p>
          </div>

          {/* Course Materials */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-4 md:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg md:text-xl font-bold text-black">
                  Materi Pembelajaran
                </h2>
                <span className="text-xs md:text-sm text-gray-500">
                  {totalLessons} Materi
                </span>
              </div>
            </div>

            {/* Sections List */}
            {course.sections?.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {course.sections.map((section, sIndex) => (
                  <div key={section.id}>
                    {/* Section Header */}
                    <div className="p-4 flex items-center justify-between bg-gray-50">
                      <div className="flex-1">
                        <h3 className="font-bold text-black text-sm md:text-base">
                          <span className="text-[#C5A059]">Bab {sIndex + 1}:</span> {section.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {section.lessons?.length || 0} materi
                        </p>
                      </div>
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>

                    {/* Lessons List */}
                    <div className="px-4 pb-4">
                      <div className="space-y-2">
                        {section.lessons?.map((lesson, lIndex) => (
                          <Link 
                            key={lesson.id} 
                            href={`/learning/course/${course.id}/lesson/${lesson.id}`}
                            className="block"
                          >
                            <div className="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mt-2 group">
                              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#C5A059]/10 mr-3 shrink-0 group-hover:bg-[#C5A059]/20 transition-colors">
                                {lesson.contentType === 'youtube' ? (
                                  <PlayCircle size={16} className="text-[#C5A059]" />
                                ) : (
                                  <BookOpen size={16} className="text-[#C5A059]" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="font-medium text-black text-sm line-clamp-2 group-hover:text-[#C5A059] transition-colors">
                                    {lesson.title}
                                  </h4>
                                  <div className="flex items-center text-xs text-gray-500 ml-2">
                                    <Clock size={12} className="mr-1" />
                                    {lesson.duration || '10'}m
                                  </div>
                                </div>
                                
                                {/* Attachment Link */}
                                {lesson.attachmentUrl && (
                                  <LessonAttachment 
                                    url={lesson.attachmentUrl} 
                                    name={lesson.attachmentName} 
                                  />
                                )}
                              </div>
                              <ChevronRight size={16} className="text-gray-300 ml-2 self-center group-hover:text-[#C5A059] transition-all transform group-hover:translate-x-1" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <BookOpen className="mx-auto text-gray-300 mb-3" size={40} />
                <p className="text-gray-500">Belum ada materi tersedia untuk kursus ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden md:block lg:sticky lg:top-8 lg:self-start lg:col-span-1">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            {firstLessonId ? (
              <Link 
                href={`/learning/course/${course.id}/lesson/${firstLessonId}`} 
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#C5A059] text-black rounded-lg font-bold text-lg mb-4 shadow-lg hover:bg-amber-500 transition-colors"
              >
                <PlayCircle />
                Mulai Belajar
              </Link>
            ) : (
              <div className="w-full text-center py-3 bg-gray-300 text-gray-600 rounded-lg font-bold text-lg mb-4">
                Materi Belum Tersedia
              </div>
            )}
            
            <div className="space-y-4 mt-4">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#C5A059]/10 rounded-lg flex items-center justify-center mr-3">
                  <BookOpen size={20} className="text-[#C5A059]"/>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Materi</p>
                  <p className="font-semibold text-black text-lg">
                    {totalLessons} Materi
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="w-10 h-10 bg-[#C5A059]/10 rounded-lg flex items-center justify-center mr-3">
                  <BookOpen size={20} className="text-[#C5A059]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Level</p>
                  <p className="font-semibold text-black text-lg capitalize">
                    {course.level || 'Semua Level'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Start Button */}
      {firstLessonId && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 p-4 bg-white border-t border-gray-200 shadow-lg">
          <Link 
            href={`/learning/course/${course.id}/lesson/${firstLessonId}`} 
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#C5A059] text-black rounded-lg font-bold shadow-lg hover:bg-amber-500 transition-colors"
          >
            <PlayCircle size={20} />
            Mulai Belajar
          </Link>
        </div>
      )}
    </div>
  );
}
