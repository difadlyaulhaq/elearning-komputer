import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate Logged In User (Student or Admin)
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    try {
      await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token in embed-url endpoint:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Read parameters
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ error: 'Parameter videoId diperlukan' }, { status: 400 });
    }

    // 3. Bunny Stream Configuration
    const libraryIdRaw = process.env.BUNNY_STREAM_LIBRARY_ID;
    const libraryId = libraryIdRaw ? libraryIdRaw.replace(/\D/g, '') : '';
    const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY;

    if (!libraryId || !tokenKey) {
      return NextResponse.json(
        { error: 'Server belum terkonfigurasi untuk Bunny Stream Token Authentication.' },
        { status: 500 }
      );
    }

    // 4. Generate expiration timestamp (UNIX timestamp in seconds, valid for 2 hours)
    const expirationSeconds = 7200; // 2 hours
    const expires = Math.floor(Date.now() / 1000) + expirationSeconds;

    // 5. Generate SHA256 Signature Token
    // Bunny Stream Format: SHA256_HEX(TokenKey + VideoId + Expires)
    const tokenMessage = tokenKey + videoId + expires.toString();
    const token = crypto.createHash('sha256').update(tokenMessage).digest('hex');

    // 6. Return Secure signed embed URL
    const embedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`;

    return NextResponse.json({ embedUrl });

  } catch (error: any) {
    console.error('❌ Embed URL API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
