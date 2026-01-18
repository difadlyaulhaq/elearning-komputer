# Rencana Implementasi Bunny.net Media Cage (Secure Video Streaming)

Dokumen ini menjelaskan langkah-langkah untuk mengintegrasikan Bunny.net Stream dengan fitur Media Cage (proteksi konten) ke dalam aplikasi Alfajr eLearning (Next.js + Capacitor).

## 1. Persiapan (Prerequisites)

Sebelum memulai kode, pastikan data berikut tersedia dari dashboard Bunny.net:
- **Library ID** (dari Video Stream Library)
- **API Key** (Video Library API Key)
- **Pull Zone / CDN Hostname** (misal: `vz-xxxx.b-cdn.net`)
- **Security Key / Token Authentication Key** (dari pengaturan Security > URL Token Authentication)

## 2. Struktur Data & Types

Perlu update interface `Lesson` untuk mendukung tipe konten baru.

### `types/index.ts`
Update `contentType` untuk mendukung `'bunny'`.

```typescript
export interface Lesson {
  // ... field lainnya
  contentType: 'youtube' | 'text' | 'bunny'; // Tambahkan 'bunny'
  // ... field lainnya
}
```

## 3. Backend Implementation (Next.js API)

Karena Media Cage menggunakan *Token Authentication*, kita harus membuat token di sisi server (aman) dan mengirimnya ke frontend. Jangan pernah mengekspos API Key atau Security Key di frontend.

### Environment Variables (`.env`)
Tambahkan variabel berikut:
```env
BUNNY_STREAM_LIBRARY_ID=...
BUNNY_STREAM_API_KEY=...
BUNNY_SECURITY_KEY=...
BUNNY_CDN_HOSTNAME=...
```

### Utility Helper (`lib/bunny-auth.ts`)
Buat fungsi helper untuk generate signed URL/Token.
Algoritma Bunny.net biasanya melibatkan SHA256 hash dari `securityKey + urlPath + expiration`.

### API Route (`app/api/video/auth/route.ts`)
Endpoint baru untuk meminta token akses video.
- **Request:** `{ videoId: string }`
- **Logic:**
  1. Validasi user session (pastikan user berhak menonton).
  2. Generate token menggunakan helper di atas.
  3. Return signed URL atau token + embed URL.

## 4. Frontend Implementation

### Komponen Player Baru (`components/learning/BunnyPlayer.tsx`)
Buat komponen khusus untuk menangani Bunny.net player.
- Bisa menggunakan **Embed Iframe** (paling mudah) atau **Hls.js** custom (lebih fleksibel).
- Untuk keamanan maksimal (Media Cage), biasanya menggunakan Embed dengan parameter `token` atau Direct Play URL yang sudah di-sign.

**Fitur yang harus dihandle:**
- **Autentikasi:** Fetch token dari API internal kita sebelum load video.
- **Tracking:** Event listener untuk `timeupdate` dan `ended` (untuk fitur *mark as complete* otomatis).
- **Watermark:** Bunny.net mendukung server-side watermark, tapi jika butuh dynamic user info (seperti email user di layar), gunakan overlay CSS seperti `ScreenProtection` yang sudah ada.

### Integrasi ke `VideoPlayer.tsx`
Update logika di `components/learning/VideoPlayer.tsx` untuk merender `BunnyPlayer` jika `lesson.contentType === 'bunny'`.

```tsx
// Pseudocode
{lesson.contentType === 'youtube' && <YouTubePlayer ... />}
{lesson.contentType === 'bunny' && <BunnyPlayer videoId={lesson.url} ... />}
```

## 5. Mobile & Capacitor Specifics

Untuk aplikasi mobile (Android), ada beberapa tantangan dengan proteksi domain (Allowed Domains) di Bunny.net:
- Capacitor meload aplikasi dari `http://localhost` (Android) atau scheme custom `capacitor://`.
- **Solusi:**
  1. Di setting Bunny.net Security, allow domain `localhost` dan `capacitor://localhost` (jika didukung).
  2. Jika menggunakan Direct Play (HLS), pastikan header `Referer` dikirim atau gunakan Token Auth yang tidak bergantung pada Referer saja.
  3. Test playback di emulator/device fisik karena behavior WebView bisa berbeda dengan browser desktop.

## 6. Langkah Kerja (Action Plan)

1.  **Update Types:** Modifikasi `types/index.ts`.
2.  **Setup Backend:**
    - Buat `lib/bunny.ts` (token generation).
    - Buat route `app/api/video/token/route.ts`.
3.  **Setup Frontend:**
    - Buat `components/learning/BunnyPlayer.tsx`.
    - Update `components/learning/VideoPlayer.tsx`.
4.  **Testing:**
    - Test di Browser (Desktop/Mobile).
    - Test di Android App (Build APK).

---
*Dibuat otomatis oleh Gemini CLI Agent*
