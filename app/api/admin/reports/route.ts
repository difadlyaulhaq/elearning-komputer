// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Course } from '@/types';
import { verifyAdmin } from '@/app/api/helpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    // 1. Ambil semua kursus, user, dan progress secara paralel
    const [coursesSnap, usersSnap, progressSnap] = await Promise.all([
      adminDb.collection('courses').get(),
      adminDb.collection('users').get(),
      adminDb.collection('progress').get()
    ]);

    const coursesMap = new Map(coursesSnap.docs.map(doc => [doc.id, doc.data() as Course]));
    const usersMap = new Map(usersSnap.docs.map(doc => [doc.id, doc.data()]));

    const reports = [];

    // 2. Format progress reports
    for (const progDoc of progressSnap.docs) {
      const progData = progDoc.data();
      const userId = progData.userId;

      if (!userId || !usersMap.has(userId)) {
        continue;
      }

      const userData = usersMap.get(userId);
      const course = coursesMap.get(progData.courseId);

      const lastAccessStr = progData.lastAccess 
        ? new Date(progData.lastAccess).toLocaleString('id-ID')
        : progData.lastAccessed 
          ? (typeof progData.lastAccessed.toDate === 'function' ? progData.lastAccessed.toDate().toLocaleString('id-ID') : new Date(progData.lastAccessed).toLocaleString('id-ID'))
          : '-';

      const completedDateStr = progData.completedAt
        ? (typeof progData.completedAt.toDate === 'function' ? progData.completedAt.toDate().toLocaleDateString('id-ID') : new Date(progData.completedAt).toLocaleDateString('id-ID'))
        : '-';

      reports.push({
        id: progDoc.id,
        name: userData?.name || 'Unnamed',
        division: userData?.division || '-',
        course: course?.title || progData.courseName || 'Unknown Course',
        progress: progData.progress || 0,
        status: progData.status || 'not-started',
        lastAccess: lastAccessStr,
        completedDate: completedDateStr
      });
    }

    return NextResponse.json(reports);

  } catch (error) {
    console.error('Error fetching reports:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
