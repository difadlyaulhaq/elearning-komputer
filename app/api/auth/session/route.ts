// app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

// GET: Mengambil data sesi pengguna yang sedang login
export async function GET(request: NextRequest) {
  try {
    let token = request.cookies.get('auth_token')?.value;

    // FALLBACK: Cek Header Authorization jika cookie kosong (untuk Mobile/Native compatibility)
    if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.split('Bearer ')[1];
        }
    }

    if (!token) {
      return NextResponse.json({ isAuthenticated: false, error: 'Token tidak ditemukan' }, { status: 401 });
    }

    let uid;

    try {
        // Coba validasi sebagai Firebase Token
        const decodedToken = await adminAuth.verifyIdToken(token);
        uid = decodedToken.uid;
    } catch (error: any) {
        // Fallback: Coba validasi sebagai Google ID Token
        if (error.codePrefix === 'auth' && error.errorInfo?.code === 'auth/argument-error') {
             try {
                const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
                if (!googleRes.ok) throw new Error('Invalid Google Token');
                
                const googleData = await googleRes.json();
                const userRecord = await adminAuth.getUserByEmail(googleData.email);
                uid = userRecord.uid;
             } catch (googleErr) {
                 throw error; // Throw error asli jika fallback gagal
             }
        } else {
            throw error;
        }
    }

    const userDoc = await adminDb.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ isAuthenticated: false, error: 'User tidak ditemukan di database' }, { status: 404 });
    }

    const user = userDoc.data();
    return NextResponse.json({ isAuthenticated: true, user });

  } catch (error: any) {
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return NextResponse.json({ isAuthenticated: false, error: 'Token tidak valid atau expired' }, { status: 401 });
    }
    return NextResponse.json({ isAuthenticated: false, error: 'Internal server error' }, { status: 500 });
  }
}


// POST: Membuat sesi (login) dan mengembalikan data user
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token tidak ditemukan' }, { status: 401 });
    }

    // Verifikasi token untuk mendapatkan info user dari Firebase Auth
    const decodedToken = await adminAuth.verifyIdToken(token);
    const { uid, email, name } = decodedToken;

    // Cek apakah user sudah ada di database Firestore
    const userDocRef = adminDb.collection('users').doc(uid);
    const userDoc = await userDocRef.get();
    
    let userData;

    if (!userDoc.exists) {
      // Jika user TIDAK ADA di Firestore, buat profil baru (Just-in-Time Provisioning)
      console.log(`User dengan UID ${uid} tidak ditemukan di Firestore. Membuat profil baru...`);
      const newUserProfile = {
        uid,
        email: email || '',
        name: name || email?.split('@')[0] || 'Pengguna Baru',
        role: 'user', // Default role
        division: 'Unassigned', // Default division
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      
      await userDocRef.set(newUserProfile);
      userData = newUserProfile;

      // Set custom claims untuk role default
      await adminAuth.setCustomUserClaims(uid, { role: 'user' });

    } else {
      // Jika user ADA, gunakan data yang ada
      userData = userDoc.data();
    }

    // Buat response
    const response = NextResponse.json({ 
      success: true,
      message: 'Login berhasil',
      user: userData 
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 hari
    };

    // Set kedua cookie yang diperlukan oleh middleware
    response.cookies.set('auth_token', token, cookieOptions);
    response.cookies.set('user_role', userData?.role || 'user', cookieOptions);

    return response;

  } catch (error: any) {
    console.error('[SESSION POST ERROR]:', error);
     if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
      return NextResponse.json({ success: false, error: 'Token tidak valid atau expired' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}