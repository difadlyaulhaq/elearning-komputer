// app/api/admin/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Course } from '@/types';
import { verifyAdmin } from '@/app/api/helpers';

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    // 1. Ambil semua kursus dan user secara paralel
    const [coursesSnap, usersSnap] = await Promise.all([
        adminDb.collection('courses').get(),
        adminDb.collection('users').where('role', '==', 'user').get()
    ]);

    // Buat map untuk akses cepat by ID
    const coursesMap = new Map(coursesSnap.docs.map(doc => [doc.id, doc.data() as Course]));
    const usersMap = new Map(usersSnap.docs.map(doc => [doc.id, doc.data()]));

    // 2. Gunakan collectionGroup untuk mengambil semua progress dari semua user dalam satu query
    const progressGroupSnap = await adminDb.collectionGroup('courses').get();

    const reports = [];

    // 3. Proses hasil query collectionGroup
    for (const progDoc of progressGroupSnap.docs) {
        const progData = progDoc.data();
        const userId = progDoc.ref.parent.parent?.id; // Dapatkan userId dari path

        if (!userId || !usersMap.has(userId)) {
            continue; // Skip jika progress tidak terhubung ke user yang valid
        }

        const userData = usersMap.get(userId);
        const course = coursesMap.get(progData.courseId);

        reports.push({
            id: `${userId}_${progDoc.id}`,
            name: userData?.name || 'Unnamed',
            division: userData?.division || '-',
            course: course?.title || 'Unknown Course',
            progress: progData.progress || 0,
            status: progData.status || 'not-started',
            lastAccess: progData.lastAccessed ? new Date(progData.lastAccessed.toDate()).toLocaleString('id-ID') : '-',
            completedDate: progData.completedAt ? new Date(progData.completedAt.toDate()).toLocaleDateString('id-ID') : '-'
        });
    }
    
    // Tambahkan user yang belum mulai kursus sama sekali
    const userIdsWithProgress = new Set(progressGroupSnap.docs.map(doc => doc.ref.parent.parent?.id));
    for(const [userId, userData] of usersMap.entries()){
        if(!userIdsWithProgress.has(userId)){
            reports.push({
                id: userId,
                name: userData.name || 'Unnamed',
                division: userData.division || '-',
                course: '-',
                progress: 0,
                status: 'not-started',
                lastAccess: '-',
                completedDate: '-'
              });
        }
    }


    return NextResponse.json(reports);

  } catch (error) {
    console.error('Error fetching reports:', error);
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
