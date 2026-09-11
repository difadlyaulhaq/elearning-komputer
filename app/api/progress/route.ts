// app/api/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// GET: Ambil semua progress (untuk admin reports)
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const { searchParams } = new URL(request.url);
    const division = searchParams.get('division');
    const status = searchParams.get('status');

    let query = adminDb.collection('progress');

    // Apply filters if provided
    if (status && status !== 'all') {
      query = query.where('status', '==', status) as any;
    }

    const progressSnapshot = await query.get();
    const progressData = progressSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // If division filter is applied, we need to fetch user data
    if (division && division !== 'all') {
      const usersSnapshot = await adminDb
        .collection('users')
        .where('division', '==', division)
        .get();
      
      const userIds = usersSnapshot.docs.map(doc => doc.id);
      const filteredProgress = progressData.filter((p: any) => 
        userIds.includes(p.userId)
      );

      return NextResponse.json({ success: true, data: filteredProgress });
    }

    return NextResponse.json({ success: true, data: progressData });
  } catch (error: any) {
    console.error('[GET ALL PROGRESS ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
