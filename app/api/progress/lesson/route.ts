// app/api/progress/lesson/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// POST: Tandai lesson sebagai selesai
export async function POST(request: NextRequest) {
  try {
    const { userId, courseId, lessonId } = await request.json();

    if (!userId || !courseId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'Parameter userId, courseId, dan lessonId wajib diisi' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    // Get course data to calculate total lessons
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Course tidak ditemukan' },
        { status: 404 }
      );
    }

    const courseData = courseDoc.data();
    const totalLessons = courseData?.sections?.reduce(
      (acc: number, section: any) => acc + (section.lessons?.length || 0),
      0
    ) || 0;

    // Check if progress document exists
    const progressRef = adminDb
      .collection('progress')
      .doc(`${userId}_${courseId}`);
    
    const progressDoc = await progressRef.get();

    if (!progressDoc.exists) {
      // Create new progress document
      const progressValue = totalLessons > 0 ? Math.round((1 / totalLessons) * 100) : 0;
      const statusValue = progressValue >= 100 ? 'completed' : 'in-progress';

      const newProgressData = {
        userId,
        courseId,
        courseName: courseData?.title || '',
        completedLessons: [lessonId],
        totalLessons,
        progress: progressValue,
        status: statusValue,
        lastAccess: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        lastAccessedLessonId: lessonId,
        ...(statusValue === 'completed' && { completedAt: new Date().toISOString() })
      };

      await progressRef.set(newProgressData);

      return NextResponse.json({
        success: true,
        message: 'Progress dimulai',
        data: newProgressData
      });
    } else {
      // Update existing progress
      const existingProgress = progressDoc.data();
      const completedLessons = existingProgress?.completedLessons || [];

      // Check if lesson already completed
      if (completedLessons.includes(lessonId)) {
        await progressRef.update({
          lastAccess: new Date().toISOString(),
          lastAccessedLessonId: lessonId,
          totalLessons: totalLessons > 0 ? totalLessons : existingProgress?.totalLessons || 0,
        });

        return NextResponse.json({
          success: true,
          message: 'Lesson sudah diselesaikan sebelumnya',
          data: {
            ...existingProgress,
            lastAccess: new Date().toISOString(),
            lastAccessedLessonId: lessonId
          }
        });
      }

      // Add lesson to completed list
      const updatedCompletedLessons = [...completedLessons, lessonId];
      const newProgress = totalLessons > 0 ? Math.round(
        (updatedCompletedLessons.length / totalLessons) * 100
      ) : 0;
      const newStatus = newProgress >= 100 ? 'completed' : 'in-progress';

      const updateData = {
        userId,
        courseId,
        courseName: existingProgress?.courseName || courseData?.title || '',
        completedLessons: updatedCompletedLessons,
        progress: newProgress,
        status: newStatus,
        lastAccess: new Date().toISOString(),
        totalLessons: totalLessons,
        lastAccessedLessonId: lessonId,
        ...(newStatus === 'completed' && {
          completedAt: existingProgress?.completedAt || new Date().toISOString()
        })
      };

      await progressRef.update(updateData);

      return NextResponse.json({
        success: true,
        message: 'Progress diperbarui',
        data: { ...existingProgress, ...updateData }
      });
    }
  } catch (error: any) {
    console.error('[COMPLETE LESSON ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
