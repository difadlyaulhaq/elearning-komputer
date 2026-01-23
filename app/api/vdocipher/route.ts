import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing videoId' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://dev.vdocipher.com/api/videos/${videoId}/otp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Apisecret ${process.env.VDO_CIPHER_API_SECRET}`,
        },
        body: JSON.stringify({
          ttl: 300,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VdoCipher API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch OTP from VdoCipher', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
