import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/app/api/helpers';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const videoId = formData.get('videoId') as string;

    if (!file || !videoId) {
      return NextResponse.json({ error: 'Missing file or videoId' }, { status: 400 });
    }

    const libraryIdRaw = process.env.BUNNY_STREAM_LIBRARY_ID;
    const libraryId = libraryIdRaw ? libraryIdRaw.replace(/\D/g, '') : '';
    const streamApiKey = process.env.BUNNY_STREAM_API_KEY;

    if (!libraryId || !streamApiKey) {
      return NextResponse.json(
        { error: 'Server belum terkonfigurasi untuk Bunny Stream.' },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bunnyUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;

    const response = await fetch(bunnyUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': streamApiKey,
        'Content-Type': 'application/octet-stream',
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Bunny Stream upload proxy error:', errorText);
      return NextResponse.json(
        { error: `Gagal mengunggah ke Bunny Stream: ${response.statusText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Video Upload Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
