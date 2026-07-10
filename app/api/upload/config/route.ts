import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
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
      console.error('Error verifying ID token in config endpoint:', error);
      return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 2. Verify Role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Not an admin' }, { status: 403 });
    }

    // 3. Get Bunny Config
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

    return NextResponse.json({
      storageZoneName: bunnyStorageZoneName,
      accessKey: bunnyStorageAccessKey,
      region: bunnyStorageRegion,
      cdnHostname: bunnyCdnHostname,
    });

  } catch (error: any) {
    console.error('❌ Upload Config API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
