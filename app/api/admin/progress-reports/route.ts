import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { User, Course, Progress } from '@/types';
import { verifyAdmin } from '@/app/api/helpers';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const [usersSnapshot, coursesSnapshot, progressSnapshot] = await Promise.all([
      adminDb.collection('users').where('role', '!=', 'admin').get(),
      adminDb.collection('courses').get(),
      adminDb.collection('progress').get(),
    ]);

    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    const allProgress = progressSnapshot.docs.map(doc => doc.data() as Progress);

    const coursesById = new Map(courses.map(course => [course.id, course]));
    const progressByUser = new Map<string, Progress[]>();

    for (const progress of allProgress) {
        if (!progressByUser.has(progress.userId)) {
            progressByUser.set(progress.userId, []);
        }
        progressByUser.get(progress.userId)!.push(progress);
    }

    const reports = users.map(user => {
      const userProgress = progressByUser.get(user.id) || [];
      
      const courseReports = userProgress.map(p => {
        const course = coursesById.get(p.courseId);
        const totalLessons = course?.sections?.reduce((acc: number, section: any) => acc + (section.lessons?.length || 0), 0) || 0;

        return {
          courseId: p.courseId,
          courseTitle: course?.title || 'Unknown Course',
          progress: p.progress,
          status: p.status,
          completedLessons: p.completedLessons?.length || 0,
          totalLessons: totalLessons
        };
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          division: user.division,
          email: user.email,
        },
        courses: courseReports,
      };
    });

    return NextResponse.json({ success: true, data: reports });

  } catch (error) {
    console.error('Error generating progress reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}
