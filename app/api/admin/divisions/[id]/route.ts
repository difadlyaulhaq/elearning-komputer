// app/api/admin/divisions/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/app/api/helpers';

// PATCH: Update divisi
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const { name, description, head, icon, color, status } = body;

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    // Cek apakah divisi ada
    const divisionRef = adminDb.collection('divisions').doc(id);
    const divisionDoc = await divisionRef.get();

    if (!divisionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Divisi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek duplikat nama (jika nama diubah)
    if (name && name !== divisionDoc.data()?.name) {
      const duplicateCheck = await adminDb
        .collection('divisions')
        .where('name', '==', name)
        .get();

      if (!duplicateCheck.empty) {
        return NextResponse.json(
          { success: false, error: 'Nama divisi sudah digunakan' },
          { status: 409 }
        );
      }
    }

    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (head !== undefined) updateData.head = head;
    if (icon) updateData.icon = icon;
    if (color) updateData.color = color;
    if (status) updateData.status = status;

    await divisionRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Divisi berhasil diperbarui'
    });

  } catch (error: any) {
    console.error('[PATCH DIVISION ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengupdate divisi' },
      { status: 500 }
    );
  }
}

// DELETE: Hapus divisi
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    const { id } = await params;

    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const divisionRef = adminDb.collection('divisions').doc(id);
    const divisionDoc = await divisionRef.get();

    if (!divisionDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Divisi tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek apakah ada pegawai yang terdaftar di divisi ini
    const usersInDivision = await adminDb
      .collection('users')
      .where('division', '==', divisionDoc.data()?.name)
      .get();

    if (!usersInDivision.empty) {
      return NextResponse.json(
        {
          success: false,
          error: `Divisi tidak bisa dihapus karena masih memiliki ${usersInDivision.size} pegawai`
        },
        { status: 400 }
      );
    }

    await divisionRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Divisi berhasil dihapus'
    });

  } catch (error: any) {
    console.error('[DELETE DIVISION ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus divisi' },
      { status: 500 }
    );
  }
}