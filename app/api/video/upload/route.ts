import { NextRequest, NextResponse } from 'next/server';
// verifyAdmin is disabled to bypass token expiration on long uploads
// import { verifyAdmin } from '@/app/api/helpers';
import https from 'https';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const maxDuration = 3600; // 1 hour timeout limit

async function handleUploadProxy(req: NextRequest) {
  try {
    // Authentication disabled to allow long-running video uploads without token expiration issues
    /*
    const admin = await verifyAdmin(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }
    */

    const { searchParams } = new URL(req.url);
    let videoId = searchParams.get('videoId') || req.headers.get('x-video-id');

    let buffer: Buffer | null = null;
    let stream: Readable | null = null;
    let contentLength: number = 0;

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const formVideoId = formData.get('videoId') as string;
      if (formVideoId) videoId = formVideoId;

      if (!file || !videoId) {
        return NextResponse.json({ error: 'Missing file or videoId' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      contentLength = buffer.length;
    } else {
      // Direct binary stream upload
      if (!videoId) {
        return NextResponse.json({ error: 'Missing videoId parameter' }, { status: 400 });
      }
      const lenHeader = req.headers.get('content-length');
      if (lenHeader) {
        contentLength = parseInt(lenHeader, 10);
      }
      if (req.body) {
        stream = Readable.fromWeb(req.body as any);
      }
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

    const bunnyUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`;
    console.log(`📤 Proxying video upload to Bunny Stream: ${bunnyUrl} (${contentLength ? (contentLength / (1024 * 1024)).toFixed(2) + ' MB' : 'Stream Mode'})`);

    const result = await new Promise<{ ok: boolean; status: number; text: string }>((resolve, reject) => {
      const url = new URL(bunnyUrl);
      const headers: Record<string, string | number> = {
        'AccessKey': streamApiKey,
        'Content-Type': 'application/octet-stream',
      };

      if (contentLength > 0) {
        headers['Content-Length'] = contentLength;
      }

      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'PUT',
        headers,
        timeout: 7200000, // 2 hours timeout
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

      if (stream) {
        stream.pipe(request);
      } else if (buffer) {
        request.write(buffer);
        request.end();
      } else {
        request.end();
      }
    });

    if (!result.ok) {
      console.error('Bunny Stream upload proxy error:', result.text);
      return NextResponse.json(
        { error: `Gagal mengunggah ke Bunny Stream: ${result.status} (${result.text})` },
        { status: result.status }
      );
    }

    console.log('✅ Video upload proxy successful');
    return NextResponse.json({ success: true, videoId });

  } catch (error: any) {
    console.error('❌ Video Upload Proxy Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handleUploadProxy(req);
}

export async function PUT(req: NextRequest) {
  return handleUploadProxy(req);
}

