import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session'; // Asumsi: Anda punya cara validasi sesi
import { generateSignedVideoUrl } from '@/lib/bunny';

export async function POST(request: Request) {
  try {
    // 1. Validasi Sesi Pengguna
    const session = await getSession();
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    }

    // 2. Ambil Video ID dari request body
    const body = await request.json();
    const { videoId } = body;

    if (!videoId || typeof videoId !== 'string') {
      return new NextResponse(JSON.stringify({ message: 'Invalid videoId' }), { status: 400 });
    }

    // 3. Generate URL yang sudah ditandatangani
    const signedUrl = generateSignedVideoUrl(videoId);

    // 4. Kirim URL ke frontend
    return NextResponse.json({ signedUrl });

  } catch (error) {
    console.error('Error generating signed video URL:', error);
    const err = error as Error;
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error', error: err.message }), { status: 500 });
  }
}
