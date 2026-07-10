import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Admin User
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token in video creation endpoint:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // Verify Admin Role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
    }

    // 2. Read Title
    const { title } = await req.json();
    if (!title) {
      return NextResponse.json({ error: 'Judul video diperlukan' }, { status: 400 });
    }

    // 3. Bunny Stream Configuration
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const streamApiKey = process.env.BUNNY_STREAM_API_KEY;

    if (!libraryId || !streamApiKey) {
      return NextResponse.json(
        { error: 'Server belum terkonfigurasi untuk Bunny Stream. Harap set BUNNY_STREAM_LIBRARY_ID dan BUNNY_STREAM_API_KEY.' },
        { status: 500 }
      );
    }

    // 4. Create Video Object in Bunny Stream
    const bunnyUrl = `https://video.bunnycdn.com/library/${libraryId}/videos`;
    const response = await fetch(bunnyUrl, {
      method: 'POST',
      headers: {
        'AccessKey': streamApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bunny Stream API error:', errorText);
      return NextResponse.json(
        { error: `Gagal membuat video di Bunny Stream: ${response.statusText}` },
        { status: response.status }
      );
    }

    const videoData = await response.json();
    const videoId = videoData.guid; // guid is the unique video ID in Bunny Stream

    // 5. Return Video Info and Credentials to Client
    return NextResponse.json({
      videoId,
      libraryId,
      accessKey: streamApiKey,
    });

  } catch (error: any) {
    console.error('❌ Create Video API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
