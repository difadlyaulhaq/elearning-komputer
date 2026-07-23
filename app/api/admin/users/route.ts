import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { verifyAdmin } from '@/app/api/helpers';

// GET: Ambil daftar semua pegawai
export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    // Cek apakah adminDb berhasil diinisialisasi
    if (!adminDb) {
      throw new Error('Koneksi database (Firebase Admin) belum siap. Cek server logs.');
    }

    const usersSnapshot = await adminDb.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    // Return JSON error agar frontend tidak menerima HTML
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

// POST: Tambah pegawai baru
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin belum siap.');
    }

    const { email, password, name, division, role } = await request.json();

    if (!email || !name || !division) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const userPassword = password && password.trim() !== '' ? password : 'Pegawai123!';

    const userRecord = await adminAuth.createUser({
      email,
      password: userPassword,
      displayName: name,
    });

    const userData = {
      uid: userRecord.uid,
      name,
      email,
      division,
      role: role || 'user',
      status: 'active',
      createdAt: new Date().toISOString()
    };

    await adminDb.collection('users').doc(userRecord.uid).set(userData);
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: role || 'user' });

    return NextResponse.json({ success: true, message: 'User berhasil dibuat' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membuat user' }, 
      { status: 500 }
    );
  }
}