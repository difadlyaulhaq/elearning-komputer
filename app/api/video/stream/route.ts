import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: NextRequest) {
  // --- Auth Check ---
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const videoUrl = searchParams.get('url');

  if (!videoUrl) {
    return NextResponse.json({ error: 'Missing url param' }, { status: 400 });
  }

  // --- Validate URL ---
  let targetUrl: URL;
  try {
    targetUrl = new URL(decodeURIComponent(videoUrl));
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const allowedHosts = [
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
  ];

  if (!allowedHosts.some((h) => targetUrl.hostname === h)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 });
  }

  // Ensure alt=media for Firebase
  if (targetUrl.hostname === 'firebasestorage.googleapis.com' && !targetUrl.searchParams.has('alt')) {
    targetUrl.searchParams.set('alt', 'media');
  }

  // --- Range Request Handling ---
  const range = request.headers.get('range');
  const headers = new Headers();
  if (range) {
    headers.set('Range', range);
  }

  try {
    const upstreamRes = await fetch(targetUrl.toString(), {
      headers,
      cache: 'no-store', // Crucial for streaming and range requests
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    // --- Build Response ---
    const responseHeaders = new Headers();
    
    // Copy essential headers for streaming/seeking
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

    // Ensure seeking works
    responseHeaders.set('Accept-Ranges', 'bytes');
    
    // Optimize browser caching for static assets
    if (!responseHeaders.has('Cache-Control')) {
        responseHeaders.set('Cache-Control', 'public, max-age=31536000, immutable');
    }

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[VIDEO PROXY ERROR]', error);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 502 });
  }
}
