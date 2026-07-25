// lib/api/helpers.ts
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies, headers } from 'next/headers';

/**
 * Helper untuk membuat response sukses
 */
export function successResponse(data: any, message?: string) {
  return NextResponse.json({
    success: true,
    message,
    data
  });
}

/**
 * Helper untuk membuat response error
 */
export function errorResponse(
  error: string, 
  status: number = 500, 
  details?: any
) {
  const isDev = process.env.NODE_ENV === 'development';
  
  return NextResponse.json(
    {
      success: false,
      error,
      ...(isDev && details ? { details } : {})
    },
    { status }
  );
}

/**
 * Helper untuk await params (Next.js 15 compatibility)
 */
export async function getParams<T>(params: Promise<T> | T): Promise<T> {
  if (params instanceof Promise) {
    return await params;
  }
  return params;
}

/**
 * Helper untuk log API request
 */
export function logApiRequest(
  method: string, 
  endpoint: string, 
  data?: any
) {
  const timestamp = new Date().toISOString();
  console.log(`[API ${method}] ${endpoint}`, {
    timestamp,
    ...(data ? { data } : {})
  });
}

/**
 * Helper untuk handle API errors
 */
export function handleApiError(error: any, context: string) {
  console.error(`[API ERROR - ${context}]:`, {
    message: error.message,
    code: error.code,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
  
  // Specific error handling
  if (error.code === 'permission-denied') {
    return errorResponse('Akses ditolak', 403);
  }
  
  if (error.code === 'not-found') {
    return errorResponse('Data tidak ditemukan', 404);
  }
  
  return errorResponse(
    error.message || 'Internal server error',
    500,
    error.stack
  );
}

/**
 * Helper untuk verifikasi token admin dari request
 */
export async function verifyAdmin(request: Request) {
  let idToken: string | undefined;

  // 1. Coba ambil dari cookie
  try {
    const cookieStore = await cookies();
    idToken = cookieStore.get('auth_token')?.value;
  } catch {}

  // 2. Fallback: Authorization header
  if (!idToken) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        idToken = authHeader.split('Bearer ')[1];
      }
    } catch {}
  }

  // 3. Fallback 2: Check request headers directly
  if (!idToken) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      idToken = authHeader.split('Bearer ')[1];
    }
  }

  if (!idToken) {
    return null;
  }

  try {
    if (!adminAuth) {
      throw new Error('Firebase Admin SDK is not initialized.');
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Check role in claims
    if (decodedToken.role === 'admin') {
      return decodedToken;
    }

    // Secondary check: user doc in Firestore (in case claims are not synced yet)
    if (adminDb) {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      if (userDoc.exists && userData?.role === 'admin' && userData?.status !== 'inactive') {
        return decodedToken;
      }
    }

    return null;
  } catch (error: any) {
    if (error?.code === 'auth/id-token-expired') {
      console.warn('[VERIFY_ADMIN_ERROR] Firebase ID token has expired.');
    } else {
      console.error('[VERIFY_ADMIN_ERROR]', error);
    }
    return null;
  }
}

/**
 * Helper untuk verifikasi token user biasa dari request
 */
export async function verifyUser(request: Request) {
  let idToken: string | undefined;

  // 1. Coba ambil dari cookie
  try {
    const cookieStore = await cookies();
    idToken = cookieStore.get('auth_token')?.value;
  } catch {}

  // 2. Fallback: Authorization header
  if (!idToken) {
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        idToken = authHeader.split('Bearer ')[1];
      }
    } catch {}
  }

  // 3. Fallback 2: Check request headers directly
  if (!idToken) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      idToken = authHeader.split('Bearer ')[1];
    }
  }

  if (!idToken) {
    return null;
  }

  try {
    if (!adminAuth) {
      throw new Error('Firebase Admin SDK is not initialized.');
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    
    // Check status in firestore
    if (adminDb) {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      if (!userDoc.exists || userDoc.data()?.status === 'inactive') {
        return null;
      }
    }

    return decodedToken;
  } catch (error: any) {
    if (error?.code === 'auth/id-token-expired') {
      console.warn('[VERIFY_USER_ERROR] Firebase ID token has expired.');
    } else {
      console.error('[VERIFY_USER_ERROR]', error);
    }
    return null;
  }
}