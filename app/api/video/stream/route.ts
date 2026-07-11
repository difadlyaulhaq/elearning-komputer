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
    const bunnyCdnHostnameRaw = process.env.BUNNY_CDN_HOSTNAME;
    const bunnyCdnHostname = bunnyCdnHostnameRaw ? bunnyCdnHostnameRaw.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

    const allowedHosts = [
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
      'internasionalkomp-cdn.b-cdn.net',
      'b-cdn.net'
    ];

    if (bunnyCdnHostname) {
      allowedHosts.push(bunnyCdnHostname);
    }

    if (!allowedHosts.some((h) => hostname === h || hostname.endsWith('.' + h))) {
      return NextResponse.json({ error: 'URL not allowed' }, { status: 403, headers: corsHeaders });
    }

    // 3. Sanitasi URL - Ubah spasi mentah menjadi %20 agar fetch tidak error
    const sanitizedUrl = videoUrl.trim().replace(/ /g, '%20');

    // 4. Handle Range Request dengan Chunking
    const range = request.headers.get('range');
    const fetchHeaders = new Headers();
    
    // Batasi ukuran chunk maksimal 5 MB untuk pemutaran video yang optimal, cepat, dan hemat memori
    const CHUNK_SIZE = 5 * 1024 * 1024; 
    let isChunked = false;

    if (range) {
      const rangeMatch = range.match(/bytes=(\d+)-(\d+)?/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const endVal = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : undefined;
        
        const chunkEnd = endVal !== undefined
          ? Math.min(endVal, start + CHUNK_SIZE - 1)
          : start + CHUNK_SIZE - 1;
        
        fetchHeaders.set('Range', `bytes=${start}-${chunkEnd}`);
        isChunked = true;
      } else {
        fetchHeaders.set('Range', range);
      }
    } else {
      // Jika browser tidak mengirim header Range, minta chunk pertama (0-5MB) agar streaming dimulai dengan cepat
      fetchHeaders.set('Range', `bytes=0-${CHUNK_SIZE - 1}`);
      isChunked = true;
    }

    const upstreamRes = await fetch(sanitizedUrl, {
      headers: fetchHeaders,
      cache: 'no-store',
      signal: request.signal, // Hubungkan abort signal dari klien agar download ke hulu berhenti saat user skip/seek/exit
    });

    // Tangani status khusus 416 (Range Not Satisfiable)
    if (upstreamRes.status === 416) {
      const responseHeaders = new Headers(corsHeaders);
      const val = upstreamRes.headers.get('content-range');
      if (val) responseHeaders.set('content-range', val);
      return new NextResponse(null, {
        status: 416,
        headers: responseHeaders,
      });
    }

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
    
    // Cache di browser untuk video statis
    if (!responseHeaders.has('Cache-Control')) {
        responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    // Jika upstream merespon dengan status 200 padahal kita meminta range, status tetap 200.
    // Jika upstream merespon 206, teruskan status 206 (atau jadikan 206 jika kita ubah non-range request menjadi range)
    const responseStatus = (upstreamRes.status === 200 && isChunked) ? 206 : upstreamRes.status;

    return new NextResponse(upstreamRes.body, {
      status: responseStatus,
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
