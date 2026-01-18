# Rencana Implementasi Detail - Bunny.net Media Cage

Dokumen ini adalah versi detail dari `plan-bunny-media-cage.md` dan menjelaskan langkah-langkah teknis untuk mengintegrasikan Bunny.net Stream dengan Media Cage (URL Token Authentication) dari nol.

## Langkah 1: Konfigurasi Awal di Dasbor Bunny.net

Sebelum menyentuh kode, siapkan environment di Bunny.net.

1.  **Buat Video Library:**
    *   Login ke dasbor Bunny.net.
    *   Navigasi ke **Stream > Video Libraries**.
    *   Klik **"Add Video Library"**, beri nama yang relevan (misal: "Alfajr Elearning Videos").
    *   **Catat `Library ID`** yang ditampilkan.

2.  **Dapatkan Kunci API:**
    *   Klik nama profil Anda di pojok kiri bawah, lalu **Account Settings**.
    *   Di bagian **API**, temukan dan **catat `API Key` Anda**.

3.  **Aktifkan Media Cage (Token Authentication):**
    *   Kembali ke Video Library yang tadi dibuat.
    *   Buka tab **Security**.
    *   **Aktifkan (enable) `URL Token Authentication`**.
    *   Sebuah **`Security Key`** akan dibuat. **Simpan kunci ini dengan aman**, karena ini adalah rahasia server.
    *   Di bagian **Allowed Referrers**, tambahkan semua domain yang akan mengakses video untuk lapisan keamanan tambahan.
        *   `localhost` (PENTING untuk Capacitor Android/iOS)
        *   `localhost:3000` (Untuk pengembangan Next.js)
        *   `nama-domain-produksi.com` (Ganti dengan domain asli Anda)
    *   Klik **Save**.

4.  **Catat Hostname CDN:**
    *   Di pengaturan Video Library, cari **Linked Pull Zone**.
    *   **Catat `Hostname`** dari Pull Zone tersebut (misal: `vz-xxxx.b-cdn.net`).

**Output yang harus Anda miliki sekarang:**
- `BUNNY_STREAM_LIBRARY_ID`
- `BUNNY_STREAM_API_KEY`
- `BUNNY_SECURITY_KEY`
- `BUNNY_CDN_HOSTNAME`

---

## Langkah 2: Update Tipe Data di Proyek

Modifikasi `interface Lesson` untuk mengenali tipe konten baru.

**File:** `types/index.ts`
```typescript
export interface Lesson {
  id: string;
  title: string;
  duration: number;
  completed: boolean;
  // Ubah baris berikut
  contentType: 'youtube' | 'text' | 'bunny'; // Tambahkan 'bunny'
  url: string; // url akan berisi Video ID dari Bunny.net
  content?: string;
}
```

---

## Langkah 3: Setup Backend (Next.js)

### 3.1. Simpan Kredensial di Environment Variables

Buat file `.env.local` di root proyek (jika belum ada) dan tambahkan kredensial yang Anda catat. **JANGAN PERNAH MENYIMPAN KUNCI RAHASIA LANGSUNG DI KODE.**

**File:** `.env.local`
```env
BUNNY_STREAM_LIBRARY_ID=...
BUNNY_STREAM_API_KEY=...
BUNNY_SECURITY_KEY=...
BUNNY_CDN_HOSTNAME=...
```

### 3.2. Buat Fungsi Generator Token

Buat file baru untuk logika autentikasi Bunny.net. Ini akan membuat token yang divalidasi oleh server Bunny.net.

**File:** `lib/bunny.ts`
```typescript
import { createHash } from 'crypto';

const securityKey = process.env.BUNNY_SECURITY_KEY!;
const cdnHostname = process.env.BUNNY_CDN_HOSTNAME!;
const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;

/**
 * Generates a signed URL for a Bunny.net video using URL Token Authentication.
 * @param videoId The ID of the video in your Bunny.net Stream library.
 * @param expirationTime The duration in minutes for which the token is valid. Defaults to 180 minutes (3 hours).
 * @returns The full, signed HLS playlist URL (playlist.m3u8).
 */
export function generateSignedVideoUrl(videoId: string, expirationTime: number = 180): string {
  if (!securityKey || !cdnHostname || !libraryId) {
    throw new Error('Bunny.net environment variables are not configured.');
  }

  // Path to the video file in the URL structure.
  const urlPath = `/` + videoId + `/playlist.m3u8`;
  
  // Expiration timestamp (Unix epoch time)
  const expires = Math.floor(Date.now() / 1000) + (expirationTime * 60);

  // The string to be hashed
  const stringToHash = securityKey + urlPath + expires;

  // Create the hash
  const hash = createHash('sha256').update(stringToHash).digest('base64');
  
  // The token uses URL-safe Base64 encoding
  const token = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signedUrl = `https://${cdnHostname}${urlPath}?token=${token}&expires=${expires}`;

  return signedUrl;
}
```

### 3.3. Buat API Endpoint

Endpoint ini akan dipanggil oleh frontend untuk mendapatkan URL video yang sudah ditandatangani (signed).

**File:** `app/api/learning/video/route.ts` (atau path lain yang sesuai)
```typescript
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
    return new NextResponse(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}
```

---

## Langkah 4: Setup Frontend (React)

### 4.1. Buat Komponen Player Khusus untuk Bunny.net

Komponen ini akan memanggil API endpoint yang baru dibuat dan memuat video menggunakan `Hls.js`.

**Install Hls.js:**
```bash
npm install hls.js
```

**File:** `components/learning/BunnyPlayer.tsx`
```typescript
'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface BunnyPlayerProps {
  videoId: string;
  onEnded: () => void;
  onTimeUpdate: (time: number) => void;
}

export default function BunnyPlayer({ videoId, onEnded, onTimeUpdate }: BunnyPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!videoId) return;

    let hls: Hls | null = null;

    async function initializePlayer() {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Ambil URL aman dari backend
        const response = await fetch('/api/learning/video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId }),
        });

        if (!response.ok) {
          throw new Error(`Failed to get video URL: ${response.statusText}`);
        }

        const data = await response.json();
        const signedUrl = data.signedUrl;

        const videoElement = videoRef.current;
        if (!videoElement) return;

        // 2. Setup Hls.js
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(signedUrl);
          hls.attachMedia(videoElement);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
             setIsLoading(false);
          });
           hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              console.error('Fatal HLS error:', data);
              setError('Gagal memuat video. Coba lagi nanti.');
            }
          });
        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          // Fallback untuk Safari/iOS native HLS
          videoElement.src = signedUrl;
          videoElement.addEventListener('loadedmetadata', () => {
             setIsLoading(false);
          });
        }

      } catch (err: any) {
        console.error(err);
        setError('Gagal memuat video. Periksa koneksi Anda.');
        setIsLoading(false);
      }
    }

    initializePlayer();

    // Cleanup
    return () => {
      hls?.destroy();
    };
  }, [videoId]);

  useEffect(() => {
     const videoElement = videoRef.current;
     if(!videoElement) return;

     const handleTimeUpdate = () => onTimeUpdate(videoElement.currentTime);
     const handleEnded = () => onEnded();

     videoElement.addEventListener('timeupdate', handleTimeUpdate);
     videoElement.addEventListener('ended', handleEnded);

     return () => {
         videoElement.removeEventListener('timeupdate', handleTimeUpdate);
         videoElement.removeEventListener('ended', handleEnded);
     }
  }, [onTimeUpdate, onEnded]);


  return (
    <div className="relative w-full aspect-video bg-black flex items-center justify-center">
      {isLoading && <p className="text-white">Memuat video...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <video
        ref={videoRef}
        controls
        className={`w-full h-full ${isLoading || error ? 'hidden' : ''}`}
        playsInline // Penting untuk mobile
      />
    </div>
  );
}
```

### 4.2. Integrasikan ke `VideoPlayer.tsx`

Modifikasi `VideoPlayer.tsx` untuk menggunakan komponen `BunnyPlayer` yang baru.

**File:** `components/learning/VideoPlayer.tsx`
```tsx
// ... imports
import BunnyPlayer from './BunnyPlayer'; // Import komponen baru

// ... di dalam fungsi komponen VideoPlayer

// Ganti logika render player
return (
  <div className="w-full">
    {lesson.contentType === 'youtube' && (
      <YouTubePlayer
        videoId={lesson.url}
        onEnded={onLessonEnd}
        onTimeUpdate={onTimeUpdate}
      />
    )}
    {lesson.contentType === 'bunny' && (
      <BunnyPlayer
        videoId={lesson.url}
        onEnded={onLessonEnd}
        onTimeUpdate={onTimeUpdate}
      />
    )}
    {lesson.contentType === 'text' && (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {/* Tampilan untuk konten teks */}
      </div>
    )}
  </div>
);
```

---

## Langkah 5: Pengujian

1.  **Upload Video:** Unggah sebuah video ke Video Library Anda di Bunny.net dan dapatkan **Video ID**-nya.
2.  **Update Data:** Pastikan ada data `lesson` di database Anda dengan `contentType: 'bunny'` dan `url` berisi **Video ID** tersebut.
3.  **Jalankan Aplikasi:** `npm run dev`.
4.  **Test di Browser:** Buka halaman *learning* yang berisi video Bunny.net. Periksa apakah video dapat diputar. Buka DevTools > Network tab untuk memastikan URL `playlist.m3u8` mengandung parameter `token` dan `expires`.
5.  **Test di Android:** Build dan jalankan aplikasi di emulator atau device fisik. Pastikan video juga bisa diputar di sana. Pengaturan `Referer: localhost` yang kita set di awal sangat krusial di sini.

Dengan mengikuti langkah-langkah ini, Anda akan memiliki implementasi Bunny.net Media Cage yang aman dan berfungsi di seluruh platform Anda.
