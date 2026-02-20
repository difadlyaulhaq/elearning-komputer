import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Section, Lesson } from '@/types';

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function generateYouTubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

// GET: Mengambil satu data kursus
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const courseRef = adminDb.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }

    const data = courseDoc.data();
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }

    // Convert Firestore Timestamp to ISO string for serialization
    const courseData = { 
      id: courseDoc.id, 
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
    };
    
    return NextResponse.json({ success: true, data: courseData });

  } catch (error: any) {
    console.error('[GET COURSE ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data kursus' },
      { status: 500 }
    );
  }
}

// PATCH: Memperbarui kursus
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const body = await request.json();

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const courseRef = adminDb.collection('courses').doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }
    
    const existingData = courseDoc.data()!;
    const updatePayload: { [key: string]: any } = {
      updatedAt: new Date(),
    };

    // Daftar field yang boleh diupdate dari body
    const allowedFields = [
      'title', 'level', 'description', 'coverImage', 'thumbnail',
      'status', 'sections', 'enrolledUserIds', 'enrolledDivisionIds'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updatePayload[field] = body[field];
      }
    });

    // Logika khusus untuk perubahan kategori
    if (body.categoryId && body.categoryId !== existingData.categoryId) {
      const categoryDoc = await adminDb.collection('categories').doc(body.categoryId).get();
      if (categoryDoc.exists) {
        updatePayload.categoryId = body.categoryId;
        updatePayload.categoryName = categoryDoc.data()?.name;
      }
    }

    // Hitung ulang data turunan (totalVideos, thumbnail)
    const finalSections = updatePayload.sections || existingData.sections;
    updatePayload.totalVideos = finalSections?.reduce((acc: number, section: any) => acc + (section.lessons?.length || 0), 0) || 0;
    
    // 🔥 FIX: Auto-generate thumbnail dari video pertama
    let courseThumbnail: string | undefined;
    if (finalSections && Array.isArray(finalSections)) {
      for (const section of finalSections as Section[]) {
        if (section.lessons && Array.isArray(section.lessons)) {
          for (const lesson of section.lessons as Lesson[]) {
            if (lesson.contentType === 'youtube' && lesson.url) {
              const videoId = getYouTubeVideoId(lesson.url);
              if (videoId) {
                courseThumbnail = generateYouTubeThumbnailUrl(videoId);
                break;
              }
            }
          }
        }
        if (courseThumbnail) break;
      }
    }
    
    // Prioritaskan: thumbnail manual > auto YouTube > coverImage > thumbnail lama
    updatePayload.thumbnail = body.thumbnail || courseThumbnail || updatePayload.coverImage || existingData.thumbnail;

    console.log('[PATCH COURSE] Updating with thumbnail:', updatePayload.thumbnail);

    await courseRef.update(updatePayload);

    // 🔥 FIX: Fetch ulang data terbaru setelah update untuk memastikan konsistensi
    const updatedCourseDoc = await courseRef.get();
    const updatedData = updatedCourseDoc.data();

    return NextResponse.json({
      success: true,
      message: 'Kursus berhasil diperbarui',
      data: {
        id: updatedCourseDoc.id,
        ...updatedData,
        createdAt: updatedData?.createdAt?.toDate ? updatedData.createdAt.toDate().toISOString() : updatedData?.createdAt,
        updatedAt: updatedData?.updatedAt?.toDate ? updatedData.updatedAt.toDate().toISOString() : updatedData?.updatedAt,
      }
    });

  } catch (error: any) {
    console.error('[PATCH COURSE ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui kursus' },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus kursus
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const courseRef = adminDb.collection('courses').doc(courseId);
    const doc = await courseRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: 'Kursus tidak ditemukan' },
        { status: 404 }
      );
    }

    await courseRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Kursus berhasil dihapus'
    });

  } catch (error: any) {
    console.error('[DELETE COURSE ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus kursus' },
      { status: 500 }
    );
  }
}