import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

// Cache di edge/server selama 1 jam (video jarang berubah)
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  // ── Auth check ───────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  // Validasi: hanya izinkan Firebase Storage URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(decodeURIComponent(videoUrl));
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const allowedHosts = [
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
  ];

  if (!allowedHosts.some((h) => parsedUrl.hostname === h)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  // Pastikan alt=media ada
  parsedUrl.searchParams.set('alt', 'media');

  // ── Forward request ke Firebase Storage ─────────────────────────────────
  const rangeHeader = request.headers.get('range');

  const fetchHeaders: Record<string, string> = {
    'Accept': 'video/mp4,video/*;q=0.9,*/*;q=0.8',
  };

  if (rangeHeader) {
    fetchHeaders['Range'] = rangeHeader;
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(parsedUrl.toString(), {
      headers: fetchHeaders,
      // Gunakan Next.js cache dengan revalidate
      next: { revalidate: 3600 },
    });
  } catch (err) {
    console.error('[VIDEO STREAM] Fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 502 });
  }

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    return NextResponse.json(
      { error: `Upstream error: ${upstreamResponse.status}` },
      { status: upstreamResponse.status }
    );
  }

  // ── Build response dengan optimized headers ──────────────────────────────
  const responseHeaders = new Headers();

  // Forward headers penting dari Firebase
  const forwardHeaders = [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'last-modified',
    'etag',
  ];

  forwardHeaders.forEach((key) => {
    const val = upstreamResponse.headers.get(key);
    if (val) responseHeaders.set(key, val);
  });

  // ── KUNCI OPTIMASI: Cache-Control agresif ────────────────────────────────
  // Browser akan cache video hingga 7 hari, CDN/edge hingga 1 jam.
  // Ini mengeliminasi re-download untuk video yang sama.
  responseHeaders.set(
    'Cache-Control',
    'public, max-age=604800, stale-while-revalidate=86400'
  );

  // Izinkan range requests dari browser
  responseHeaders.set('Accept-Ranges', 'bytes');

  // Security headers
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  // Tidak ada Content-Disposition agar browser langsung play (bukan download)
  responseHeaders.delete('content-disposition');

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status, // 200 atau 206
    headers: responseHeaders,
  });
}
