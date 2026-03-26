import { notFound, redirect } from "next/navigation";
import { getCoursePageData } from "@/lib/data/courses";
import { getCurrentUser } from "@/lib/session";
import { adminDb } from "@/lib/firebase/admin";
// Import the new ClientLessonPlayers component
import { ClientLessonPlayers } from "@/components/learning/ClientLessonPlayers";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;

  const [user, course] = await Promise.all([
    getCurrentUser(),
    getCoursePageData(courseId),
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

  let completedLessons: string[] = [];
  if (user && adminDb) {
    const progressDoc = await adminDb
      .collection("progress")
      .doc(`${user.id}_${courseId}`)
      .get();
    
    if (progressDoc.exists) {
      completedLessons = progressDoc.data()?.completedLessons || [];
    }
  }

  const allLessons = course.sections.flatMap((section) => section.lessons);
  const currentLessonIndex = allLessons.findIndex(
    (l) => String(l.id) === String(lessonId)
  );

  if (currentLessonIndex === -1) {
    notFound();
  }

  const currentLesson = allLessons[currentLessonIndex];
  const prevLesson = allLessons[currentLessonIndex - 1] || null;
  const nextLesson = allLessons[currentLessonIndex + 1] || null;

  return (
    <ClientLessonPlayers
      courseId={courseId}
      courseTitle={course.title}
      lesson={currentLesson}
      prevLesson={prevLesson}
      nextLesson={nextLesson}
      completedLessons={completedLessons}
      isCompleted={completedLessons.includes(currentLesson.id)}
    />
  );
}
