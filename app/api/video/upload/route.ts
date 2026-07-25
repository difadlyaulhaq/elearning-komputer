import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/app/api/helpers';
import https from 'https';

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
    console.log(`📤 Proxying video upload to Bunny Stream: ${bunnyUrl} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);

    const result = await new Promise<{ ok: boolean; status: number; text: string }>((resolve, reject) => {
      const url = new URL(bunnyUrl);
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'PUT',
        headers: {
          'AccessKey': streamApiKey,
          'Content-Type': 'application/octet-stream',
          'Content-Length': buffer.length,
        },
        timeout: 7200000, // 2 hours timeout to accommodate very large videos or slow connections
      };

      const request = https.request(options, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            ok: !!(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
            status: res.statusCode || 500,
            text: body,
          });
        });
      });

      request.on('timeout', () => {
        console.error('⚠️ Bunny Stream upload request timed out');
        request.destroy(new Error('Upload timed out'));
      });

      request.on('error', (err) => {
        console.error('❌ Bunny Stream HTTPS request error:', err);
        reject(err);
      });

      // Write video buffer to request stream
      request.write(buffer);
      request.end();
    });

    if (!result.ok) {
      console.error('Bunny Stream upload proxy error:', result.text);
      return NextResponse.json(
        { error: `Gagal mengunggah ke Bunny Stream: ${result.status} (${result.text})` },
        { status: result.status }
      );
    }

    console.log('✅ Video upload proxy successful');
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ Video Upload Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
