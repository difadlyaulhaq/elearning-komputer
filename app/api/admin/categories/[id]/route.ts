// app/api/admin/categories/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/app/api/helpers';

// PATCH: Update kategori
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const { name, description, icon, color, status } = body;

    console.log('[API CATEGORY PATCH] Updating category:', id);

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const categoryRef = adminDb.collection('categories').doc(id);
    const categoryDoc = await categoryRef.get();

    if (!categoryDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Kategori tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek duplikat nama (jika nama diubah)
    if (name && name !== categoryDoc.data()?.name) {
      const duplicateCheck = await adminDb
        .collection('categories')
        .where('name', '==', name)
        .get();

      if (!duplicateCheck.empty) {
        return NextResponse.json(
          { success: false, error: 'Nama kategori sudah digunakan' },
          { status: 409 }
        );
      }
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (icon) updateData.icon = icon;
    if (color) updateData.color = color;
    if (status) updateData.status = status;

    await categoryRef.update(updateData);

    // Jika nama kategori diubah, perbarui semua kursus terkait
    if (updateData.name && updateData.name !== categoryDoc.data()?.name) {
      console.log(`[API CATEGORY PATCH] Nama kategori berubah. Memperbarui kursus dengan categoryId: ${id}...`);
      const coursesRef = adminDb.collection('courses');
      const coursesToUpdateSnapshot = await coursesRef.where('categoryId', '==', id).get();

      if (!coursesToUpdateSnapshot.empty) {
        const batch = adminDb.batch();
        coursesToUpdateSnapshot.forEach(doc => {
          batch.update(doc.ref, { categoryName: updateData.name });
        });
        await batch.commit();
        console.log(`[API CATEGORY PATCH] Berhasil memperbarui ${coursesToUpdateSnapshot.size} kursus dengan nama kategori baru.`);
      } else {
        console.log('[API CATEGORY PATCH] Tidak ada kursus yang ditemukan dengan categoryId ini. Tidak ada kursus yang diperbarui.');
      }
    }

    console.log('[API CATEGORY PATCH] Category updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil diperbarui'
    });

  } catch (error: any) {
    console.error('[API CATEGORY PATCH ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengupdate kategori' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus kategori
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const { id } = await context.params;

    console.log('[API CATEGORY DELETE] Deleting category:', id);

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const categoryRef = adminDb.collection('categories').doc(id);
    const categoryDoc = await categoryRef.get();

    if (!categoryDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Kategori tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek apakah ada kursus yang menggunakan kategori ini
    const coursesWithCategory = await adminDb
      .collection('courses')
      .where('categoryId', '==', id)
      .get();

    if (!coursesWithCategory.empty) {
      return NextResponse.json(
        {
          success: false,
          error: `Kategori tidak bisa dihapus karena masih digunakan oleh ${coursesWithCategory.size} kursus`
        },
        { status: 400 }
      );
    }

    await categoryRef.delete();

    console.log('[API CATEGORY DELETE] Category deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil dihapus'
    });

  } catch (error: any) {
    console.error('[API CATEGORY DELETE ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus kategori' },
      { status: 500 }
    );
  }
}