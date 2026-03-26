import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import type { User } from '@/types'; // Import the main User type

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  let idToken = cookieStore.get('auth_token')?.value;

  // FALLBACK UNTUK MOBILE: Cek Header Authorization jika cookie kosong
  if (!idToken) {
    const { headers } = await import('next/headers');
    const headerStore = await headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      idToken = authHeader.split('Bearer ')[1];
    }
  }

  if (!idToken) {
    return null;
  }

  try {
    if (!adminAuth || !adminDb) {
      throw new Error("Firebase Admin SDK is not initialized.");
    }
    
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // After verifying the token, get the full user profile from Firestore
    // This ensures we have the correct role, division, etc.
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      console.warn(`User with UID ${decodedToken.uid} not found in Firestore.`);
      return null;
    }

    const userData = userDoc.data();

    // Construct the user object according to the User type
    const user: User = {
      id: userDoc.id,
      ...userData,
      // Ensure fields match the 'User' type from types/index.ts
      name: userData?.name || 'No Name',
      email: userData?.email || '',
      division: userData?.division || 'Unassigned',
      role: userData?.role || 'user',
      status: userData?.status || 'inactive',
      createdAt: userData?.createdAt?.toDate ? userData.createdAt.toDate() : new Date(),
    };

    return user;

  } catch (error) {
    console.error("[GET_CURRENT_USER_ERROR] Failed to verify session token and get user:", error);
    // This can happen if the token is expired or invalid
    return null;
  }
}
