import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin'; 
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token missing' }, { status: 400 });
    }

    // 1. Coba Verifikasi sebagai Firebase Token
    let uid;
    let email;
    
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        uid = decodedToken.uid;
        email = decodedToken.email;
    } catch (firebaseError: any) {
        // Jika gagal karena audience tidak cocok, coba verifikasi sebagai Google ID Token
        if (firebaseError.codePrefix === 'auth' && firebaseError.errorInfo?.code === 'auth/argument-error') {
            console.log('Token bukan Firebase Token, mencoba verifikasi sebagai Google ID Token...');
            
            try {
                // Validasi ke Google Endpoint
                const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
                
                if (!googleRes.ok) {
                   throw new Error('Google Token Invalid');
                }
                
                const googleData = await googleRes.json();
                
                // Security Check 1: Verify Email is verified
                if (googleData.email_verified !== 'true' && googleData.email_verified !== true) {
                    throw new Error('Google email is not verified');
                }
                
                // Security Check 2: Verify Issuer
                const allowedIssuers = ['accounts.google.com', 'https://accounts.google.com'];
                if (!allowedIssuers.includes(googleData.iss)) {
                    throw new Error('Invalid token issuer');
                }

                // Security Check 3: Verify Audience to prevent cross-app token reuse
                const allowedClientIds = process.env.GOOGLE_CLIENT_IDS?.split(',').map(id => id.trim()) || [];
                if (allowedClientIds.length > 0) {
                    if (!allowedClientIds.includes(googleData.aud)) {
                        console.error(`[AUTH ERROR] Google ID Token audience mismatch: ${googleData.aud}`);
                        throw new Error('Google ID Token audience mismatch (Potential Cross-App Attack)');
                    }
                } else if (process.env.NODE_ENV === 'production') {
                    console.error('[AUTH ERROR] GOOGLE_CLIENT_IDS is not configured in production. Blocking raw Google ID Token fallback.');
                    throw new Error('Google Sign-In validation is misconfigured on the server');
                } else {
                    console.warn('[AUTH WARNING] GOOGLE_CLIENT_IDS is not configured. Allowing token verification without audience check in development.');
                }

                email = googleData.email;
                if (!email) throw new Error('Email tidak ditemukan di token Google');

                // Cari User di Firebase Auth berdasarkan Email
                try {
                    const userRecord = await adminAuth.getUserByEmail(email);
                    uid = userRecord.uid;
                } catch (userError: any) {
                    if (userError.code === 'auth/user-not-found') {
                        // User TIDAK ditemukan di Auth -> TOLAK LOGIN
                        return NextResponse.json({ 
                            error: 'Akun tidak terdaftar. Silakan hubungi admin.' 
                        }, { status: 403 });
                    }
                    throw userError;
                }

            } catch (googleError) {
                console.error('Gagal verifikasi Google Token:', googleError);
                throw firebaseError; // Throw error asli Firebase
            }
        } else {
             throw firebaseError;
        }
    }
    
    // --- CEK FIRESTORE (Database) ---
    // Pastikan user benar-benar ada di collection 'users'
    const userDoc = await adminDb.collection('users').doc(uid).get();

    if (!userDoc.exists) {
        return NextResponse.json({ 
            error: 'Akun Anda belum aktif atau tidak terdaftar di database pegawai.' 
        }, { status: 403 });
    }

    const userData = userDoc.data();
    
    // Opsional: Cek status user (jika ada field status)
    if (userData?.status === 'inactive') {
        return NextResponse.json({ 
            error: 'Akun Anda dinonaktifkan.' 
        }, { status: 403 });
    }

    // --- PROSES SET COOKIE ---
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 hari

    const cookieStore = await cookies();
    
    cookieStore.set('auth_token', token, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    const role = (userData?.role as string) || 'employee';

    cookieStore.set('user_role', role, {
      maxAge: expiresIn,
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return NextResponse.json({ success: true, uid: uid });

  } catch (error) {
    console.error('Login Native Error:', error);
    return NextResponse.json({ error: 'Login gagal. Coba lagi.' }, { status: 401 });
  }
}
