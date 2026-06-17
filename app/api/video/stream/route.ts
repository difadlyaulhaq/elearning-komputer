import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  // Header CORS dasar agar browser tidak memblokir respon proxy
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
  };

  try {
    // 1. Auth Check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing url param' }, { status: 400, headers: corsHeaders });
    }

    // 2. Validasi Host - Menggunakan regex agar tidak crash jika ada spasi mentah di URL
    const hostMatch = videoUrl.match(/^https?:\/\/([^\/?#]+)/i);
    if (!hostMatch) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400, headers: corsHeaders });
    }

    const hostname = hostMatch[1];
    const allowedHosts = [
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
    ];

    if (!allowedHosts.some((h) => hostname === h)) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403, headers: corsHeaders });
    }

    // 3. Sanitasi URL - Ubah spasi mentah menjadi %20 agar fetch tidak error
    const sanitizedUrl = videoUrl.trim().replace(/ /g, '%20');

    // 4. Handle Range Request
    const range = request.headers.get('range');
    const fetchHeaders = new Headers();
    if (range) {
      fetchHeaders.set('Range', range);
    }

    const upstreamRes = await fetch(sanitizedUrl, {
      headers: fetchHeaders,
      cache: 'no-store',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: upstreamRes.status, headers: corsHeaders }
      );
    }

    // 5. Bangun Respon dengan Header Streaming
    const responseHeaders = new Headers(corsHeaders);
    
    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'last-modified',
      'etag',
      'cache-control'
    ];

    headersToForward.forEach(header => {
      const val = upstreamRes.headers.get(header);
      if (val) responseHeaders.set(header, val);
    });

    // Pastikan seeking tetap jalan
    responseHeaders.set('Accept-Ranges', 'bytes');
    
    // Cache di browser selama 1 tahun untuk gambar/video statis
    if (!responseHeaders.has('Cache-Control')) {
        responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });

  } catch (error: any) {
    console.error('[VIDEO PROXY ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to stream video', details: error.message }, 
      { status: 502, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
