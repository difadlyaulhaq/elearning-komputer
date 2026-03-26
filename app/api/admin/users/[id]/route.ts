import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

// PATCH: Update data user (Edit)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { email, password, name, division, role } = body;

    console.log(`[USER_UPDATE] Updating user ${id}:`, { email, name, division, role, hasPassword: !!password });

    // 1. Ambil data user lama dari Auth untuk perbandingan
    const currentUser = await adminAuth.getUser(id);

    // 2. Siapkan update untuk Firebase Authentication
    const updateAuthParams: any = {};
    if (name && name !== currentUser.displayName) updateAuthParams.displayName = name;
    if (email && email !== currentUser.email) updateAuthParams.email = email;
    if (password && password.trim() !== '') updateAuthParams.password = password;

    if (Object.keys(updateAuthParams).length > 0) {
      console.log(`[USER_UPDATE] Updating Auth for ${id}:`, Object.keys(updateAuthParams));
      await adminAuth.updateUser(id, updateAuthParams);
    }

    // 3. Update Custom Claims jika role berubah
    if (role) {
      await adminAuth.setCustomUserClaims(id, { role });
    }

    // 4. Update data di Firestore secara eksplisit
    const updateFirestoreData: any = {
      updatedAt: new Date().toISOString()
    };
    
    if (name) updateFirestoreData.name = name;
    if (email) updateFirestoreData.email = email;
    if (division) updateFirestoreData.division = division;
    if (role) updateFirestoreData.role = role;

    console.log(`[USER_UPDATE] Updating Firestore for ${id}:`, updateFirestoreData);
    await adminDb.collection('users').doc(id).update(updateFirestoreData);

    return NextResponse.json({ success: true, message: 'Data user berhasil diperbarui' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus user permanen (Opsional, jika Anda butuh fitur delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Hapus dari Auth
    await adminAuth.deleteUser(id);

    // 2. Hapus dari Firestore
    await adminDb.collection('users').doc(id).delete();

    return NextResponse.json({ success: true, message: 'User berhasil dihapus permanen' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}