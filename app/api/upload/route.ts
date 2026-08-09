import { NextRequest, NextResponse } from 'next/server';
// verifyUser is disabled to bypass token expiration on long uploads
// import { verifyUser } from '@/app/api/helpers';

export const dynamic = 'force-dynamic';
export const maxDuration = 3600; // 1 hour timeout limit

export async function POST(req: NextRequest) {
  try {
    // Authentication disabled to allow long-running uploads without token expiration issues
    /*
    const user = await verifyUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    */
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'files';

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada berkas yang diunggah' }, { status: 400 });
    }

    // Bunny.net Configuration
    const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
    const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
    const bunnyStorageRegionRaw = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com';
    const bunnyStorageRegion = bunnyStorageRegionRaw.split(/\s+/)[0];
    const bunnyCdnHostnameRaw = process.env.BUNNY_CDN_HOSTNAME;
    const bunnyCdnHostname = bunnyCdnHostnameRaw ? bunnyCdnHostnameRaw.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

    if (!bunnyStorageZoneName || !bunnyStorageAccessKey || !bunnyCdnHostname) {
      return NextResponse.json(
        { error: 'Server belum terkonfigurasi untuk Bunny.net Storage' },
        { status: 500 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sanitize filename to avoid weird character issues
    const sanitizedFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const remotePath = `${folder}/${sanitizedFileName}`;

    // Send PUT request to Bunny.net Storage
    const bunnyUrl = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${remotePath}`;
    
    console.log(`📤 Proxying upload to Bunny: ${bunnyUrl} (${(buffer.length / (1024 * 1024)).toFixed(2)} MB)`);

    const response = await fetch(bunnyUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': bunnyStorageAccessKey,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Bunny.net storage response error:', errorText);
      return NextResponse.json(
        { error: `Bunny.net upload failed: ${response.statusText} (${errorText})` },
        { status: 500 }
      );
    }

    // Construct CDN URL
    const cdnUrl = `https://${bunnyCdnHostname}/${remotePath}`;
    console.log(`✅ Proxy upload successful: ${cdnUrl}`);

    return NextResponse.json({
      url: cdnUrl,
      fileName: file.name
    });

  } catch (error: any) {
    console.error('❌ Upload API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
