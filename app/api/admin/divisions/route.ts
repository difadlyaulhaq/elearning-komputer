// app/api/admin/divisions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// GET: Ambil semua divisi
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const divisionsSnapshot = await adminDb
      .collection('divisions')
      .orderBy('createdAt', 'desc')
      .get();
    
    const divisions = divisionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, data: divisions });
  } catch (error: any) {
    console.error('[GET DIVISIONS ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data divisi' },
      { status: 500 }
    );
  }
}

// POST: Tambah divisi baru
export async function POST(request: NextRequest) {
  try {
    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const { name, description, head, icon, color } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Nama divisi wajib diisi' },
        { status: 400 }
      );
    }

    // Cek duplikat nama divisi
    const existingDivision = await adminDb
      .collection('divisions')
      .where('name', '==', name)
      .get();

    if (!existingDivision.empty) {
      return NextResponse.json(
        { success: false, error: 'Divisi dengan nama ini sudah ada' },
        { status: 409 }
      );
    }

    const divisionData = {
      name: name.trim(),
      description: description || '',
      head: head || '', // Kepala divisi
      icon: icon || '🏢', // Default icon
      color: color || '#0284c7', // Default color
      employeeCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection('divisions').add(divisionData);

    return NextResponse.json({
      success: true,
      message: 'Divisi berhasil dibuat',
      data: { id: docRef.id, ...divisionData }
    });

  } catch (error: any) {
    console.error('[POST DIVISION ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membuat divisi' },
      { status: 500 }
    );
  }
}