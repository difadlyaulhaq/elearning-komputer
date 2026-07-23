// app/api/admin/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Course, Section, Lesson } from '@/types';
import { verifyAdmin, verifyUser } from '@/app/api/helpers';

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function generateYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// GET: Mengambil semua data kursus
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const coursesSnapshot = await adminDb.collection('courses').orderBy('createdAt', 'desc').get();
    
    const courses = coursesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      };
    });

    return NextResponse.json({ success: true, data: courses });

  } catch (error: any) {
    console.error('[GET ALL COURSES ERROR]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data kursus' },
      { status: 500 }
    );
  }
}

// POST: Membuat kursus baru
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    if (!adminDb) {
      throw new Error('Firebase Admin not initialized');
    }

    const body = await request.json();
    
    // Simple validation
    if (!body.title || !body.categoryId) {
      return NextResponse.json(
        { success: false, error: 'Judul dan Kategori wajib diisi' },
        { status: 400 }
      );
    }
    
    // Get categoryName from categoryId
    const categoryDoc = await adminDb.collection('categories').doc(body.categoryId).get();
    const categoryName = categoryDoc.exists ? categoryDoc.data()?.name : 'Uncategorized';

    // 🔥 FIX: Auto-generate thumbnail dari video YouTube pertama
    let courseThumbnail: string | undefined;

    if (body.sections && Array.isArray(body.sections)) {
      for (const section of body.sections as Section[]) {
        if (section.lessons && Array.isArray(section.lessons)) {
          for (const lesson of section.lessons as Lesson[]) {
            if (lesson.contentType === 'youtube' && lesson.url) {
              const videoId = getYouTubeVideoId(lesson.url);
              if (videoId) {
                courseThumbnail = generateYouTubeThumbnailUrl(videoId);
                console.log('[POST COURSE] Generated thumbnail from video:', courseThumbnail);
                break; 
              }
            }
          }
        }
        if (courseThumbnail) break; 
      }
    }

    const newCourse: Omit<Course, 'id'> = {
      ...body,
      categoryName: categoryName,
      thumbnail: body.thumbnail || courseThumbnail || body.coverImage, // Prioritas: manual > video > coverImage
      totalVideos: body.sections?.reduce((acc: number, section: any) => acc + (section.lessons?.length || 0), 0) || 0,
      totalStudents: 0, 
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('[POST COURSE] Creating course with thumbnail:', newCourse.thumbnail);

    const docRef = await adminDb.collection('courses').add(newCourse);

    // 🔥 FIX: Fetch kembali data yang baru dibuat untuk memastikan konsistensi
    const createdDoc = await docRef.get();
    const createdData = createdDoc.data();

    return NextResponse.json({ 
        success: true, 
        message: 'Kursus berhasil dibuat', 
        data: { 
          id: docRef.id, 
          ...createdData,
          createdAt: createdData?.createdAt?.toDate ? createdData.createdAt.toDate().toISOString() : createdData?.createdAt,
          updatedAt: createdData?.updatedAt?.toDate ? createdData.updatedAt.toDate().toISOString() : createdData?.updatedAt,
        } 
    }, { status: 201 });

  } catch (error: any) {
    console.error('[POST COURSE ERROR]:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat kursus' },
      { status: 500 }
    );
  }
}