import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');

    if (!fileUrl) {
      return new NextResponse('URL parameter is required', { status: 400 });
    }

    // SSRF Guard: Only allow b-cdn.net domains or own domain
    let parsedUrl;
    try {
      parsedUrl = new URL(fileUrl);
    } catch {
      return new NextResponse('Invalid URL', { status: 400 });
    }

    const hostname = parsedUrl.hostname;
    const isAllowedHost = hostname.endsWith('b-cdn.net') || hostname === 'elearninginternasionalkomp.web.id';

    if (!isAllowedHost) {
      return new NextResponse('Forbidden host', { status: 403 });
    }

    // Fetch the file from Bunny CDN
    // Pass the Referer header to bypass Hotlink Protection
    const response = await fetch(fileUrl, {
      headers: {
        'Referer': 'https://elearninginternasionalkomp.web.id',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch file: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const contentLength = response.headers.get('content-length');
    
    // Get filename from url
    const filename = fileUrl.split('/').pop() || 'file';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    
    // Determine whether to force download or view inline
    const isDownload = searchParams.get('download') === 'true';
    const disposition = isDownload ? 'attachment' : 'inline';
    headers.set('Content-Disposition', `${disposition}; filename="${filename}"`);
    
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('[VIEW_FILE_PROXY_ERROR]', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
