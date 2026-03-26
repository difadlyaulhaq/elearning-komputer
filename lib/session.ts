import 'server-only';
import { cookies, headers } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { User } from '@/types';

export async function getCurrentUser(): Promise<User | null> {
  let idToken: string | undefined;

  // 1. Coba ambil dari cookie (web browser)
  try {
    const cookieStore = await cookies();
    idToken = cookieStore.get('auth_token')?.value;
  } catch {
    // cookies() bisa throw di beberapa konteks, lanjutkan ke fallback
  }

  // 2. Fallback: Authorization header (Capacitor native app / Android WebView)
  if (!idToken) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        idToken = authHeader.split('Bearer ')[1];
      }
    } catch {
      // headers() juga bisa throw, abaikan
    }
  }

  if (!idToken) {
    return null;
  }

  try {
    if (!adminAuth || !adminDb) {
      throw new Error('Firebase Admin SDK is not initialized.');
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      console.warn(`User with UID ${decodedToken.uid} not found in Firestore.`);
      return null;
    }

    const userData = userDoc.data();

    const user: User = {
      id: userDoc.id,
      ...userData,
      name: userData?.name || 'No Name',
      email: userData?.email || '',
      division: userData?.division || 'Unassigned',
      role: userData?.role || 'user',
      status: userData?.status || 'inactive',
      createdAt: userData?.createdAt?.toDate
        ? userData.createdAt.toDate()
        : new Date(),
    } as User;

    return user;
  } catch (error) {
    console.error('[GET_CURRENT_USER_ERROR]', error);
    return null;
  }
}
