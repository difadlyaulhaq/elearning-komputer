// app/api/admin/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifyAdmin, verifyUser } from '@/app/api/helpers';

// GET: Ambil semua kategori
export async function GET(request: NextRequest) {
  try {
    const user = await verifyUser(request);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const categoriesSnapshot = await adminDb
      .collection('categories')
      .orderBy('createdAt', 'desc')
      .get();
    
    const categories = categoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, data: categories });
  } catch (error: any) {
    console.error('[GET CATEGORIES ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data kategori' },
      { status: 500 }
    );
  }
}

// POST: Tambah kategori baru
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    if (!adminDb) {
      throw new Error('Firebase Admin belum siap');
    }

    const { name, description, icon, color } = await request.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Nama kategori wajib diisi' },
        { status: 400 }
      );
    }

    // Cek duplikat nama kategori
    const existingCategory = await adminDb
      .collection('categories')
      .where('name', '==', name)
      .get();

    if (!existingCategory.empty) {
      return NextResponse.json(
        { success: false, error: 'Kategori dengan nama ini sudah ada' },
        { status: 409 }
      );
    }

    const categoryData = {
      name: name.trim(),
      description: description || '',
      icon: icon || '📚', // Default icon
      color: color || '#0284c7', // Default color
      courseCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection('categories').add(categoryData);

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil dibuat',
      data: { id: docRef.id, ...categoryData }
    });

  } catch (error: any) {
    console.error('[POST CATEGORY ERROR]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membuat kategori' },
      { status: 500 }
    );
  }
}