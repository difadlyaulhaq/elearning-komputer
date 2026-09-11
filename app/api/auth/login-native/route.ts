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
                // Sanitasi dan parsing GOOGLE_CLIENT_IDS dari environment variable
                const rawEnvIds = (process.env.GOOGLE_CLIENT_IDS || '')
                    .replace(/[\r\n\t\s]+/g, ' ')
                    .split(',')
                    .map(id => id.trim())
                    .filter(Boolean);

                const defaultClientIds = [
                    '237681279253-tu2j5l7pdpti9lsm707c429gkvc0bqai.apps.googleusercontent.com',
                    '237681279253-t11m0c79iqegehnjq6u1inh2nqdtaho8.apps.googleusercontent.com',
                ];

                const allowedClientIds = Array.from(new Set([...defaultClientIds, ...rawEnvIds]));

                if (!allowedClientIds.includes(googleData.aud)) {
                    console.error('[AUTH ERROR] Google ID Token audience mismatch');
                    throw new Error('Google ID Token audience tidak valid.');
                }

                email = googleData.email;
                if (!email) throw new Error('Email tidak ditemukan di token Google.');

                // Cari User di Firebase Auth berdasarkan Email
                try {
                    const userRecord = await adminAuth.getUserByEmail(email);
                    uid = userRecord.uid;
                } catch (userError: any) {
                    if (userError.code === 'auth/user-not-found') {
                        return NextResponse.json({ 
                            error: 'Akun Google Anda belum terdaftar di sistem. Silakan hubungi admin.' 
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
    let userDoc = await adminDb.collection('users').doc(uid).get();

    // Fallback: jika doc(uid) tidak ada, cari berdasarkan email
    if (!userDoc.exists && email) {
        const emailQuery = await adminDb.collection('users').where('email', '==', email).limit(1).get();
        if (!emailQuery.empty) {
            userDoc = emailQuery.docs[0];
        }
    }

    if (!userDoc.exists) {
        return NextResponse.json({ 
            error: 'Akun Anda belum aktif atau tidak terdaftar di database pegawai.' 
        }, { status: 403 });
    }

    const userData = userDoc.data();
    
    if (userData?.status === 'inactive') {
        return NextResponse.json({ 
            error: 'Akun Anda dinonaktifkan. Silakan hubungi admin.' 
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

    // Sanitasi data yang dikembalikan ke client (hanya field publik yang aman)
    const sanitizedUser = {
      uid: userDoc.id || uid,
      email: userData?.email || email,
      displayName: userData?.displayName || userData?.name || 'User',
      role: role,
      department: userData?.department || '',
      position: userData?.position || '',
    };

    return NextResponse.json({ 
      success: true, 
      uid: sanitizedUser.uid,
      user: sanitizedUser 
    });

  } catch (error: any) {
    console.error('Login Native Error:', error);
    return NextResponse.json({ 
      error: 'Autentikasi gagal. Silakan coba beberapa saat lagi atau periksa akun Anda.' 
    }, { status: 401 });
  }
}
