import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin'; // Import admin for admin.storage()
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate Admin User
    const authorization = req.headers.get('Authorization');
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authorization.split('Bearer ')[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (error) {
      console.error('Error verifying ID token:', error);
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (decodedToken.role !== 'admin') { // Assuming 'role' is a custom claim
      return NextResponse.json({ message: 'Forbidden: Not an admin' }, { status: 403 });
    }

    // 2. Parse the incoming form data (video file)
    const formData = await req.formData();
    const videoFile = formData.get('video') as File | null;

    if (!videoFile) {
      return NextResponse.json({ message: 'No video file provided' }, { status: 400 });
    }

    const bucket = admin.storage().bucket();
    const fileName = `videos/${uuidv4()}-${videoFile.name}`;
    const file = bucket.file(fileName);

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());

    await file.save(videoBuffer, {
      metadata: {
        contentType: videoFile.type,
      },
      public: true, // Make the file publicly accessible
    });

    // 4. Generate a public download URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // A very distant future date
    });

    // 5. Return Video Information
    return NextResponse.json({
      message: 'Video uploaded successfully',
      url,
      fileName: videoFile.name,
      size: videoFile.size,
      contentType: videoFile.type,
    }, { status: 200 });

  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
