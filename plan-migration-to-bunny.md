# Rencana Migrasi Penuh ke Bunny.net Stream

Dokumen ini menguraikan langkah-langkah strategis dan teknis untuk memigrasikan seluruh konten video dari YouTube ke Bunny.net Stream, menjadikannya sebagai satu-satunya platform video dalam aplikasi Alfajr eLearning.

## 1. Tujuan Utama

-   **Menghapus Ketergantungan:** Mengeliminasi semua ketergantungan pada YouTube Player API dan infrastrukturnya.
-   **Konsolidasi Platform:** Menggunakan Bunny.net sebagai satu-satunya penyedia untuk hosting, pengiriman, dan keamanan video.
-   **Penyederhanaan Kode:** Membersihkan dan menyederhanakan codebase dengan menghapus logika pemutar video yang duplikat atau kondisional.
-   **Pengalaman Pengguna yang Konsisten:** Memberikan pengalaman pemutaran video yang seragam di semua materi pembelajaran.

## 2. Prasyarat Sebelum Migrasi

Sebelum memulai perubahan kode, pastikan hal berikut sudah terpenuhi:

1.  **Konten Video Lengkap:** Semua video yang saat ini menggunakan YouTube telah diunggah ke Bunny.net Video Library Anda.
2.  **Pembaruan Database:**
    *   Data `Lesson` di database Anda telah diperbarui.
    *   Semua entri yang sebelumnya memiliki `contentType: 'youtube'` harus diubah menjadi `contentType: 'bunny'`.
    *   Kolom `url` untuk pelajaran tersebut harus berisi **Video ID** dari Bunny.net, bukan lagi URL YouTube.

## 3. Langkah-Langkah Implementasi Teknis

### Langkah 3.1: Update Tipe Data (`types/index.ts`)

Langkah pertama adalah memperbarui definisi tipe data untuk mencerminkan bahwa YouTube tidak lagi menjadi opsi.

-   Buka file `types/index.ts`.
-   Modifikasi `interface Lesson`:
    ```typescript
    export interface Lesson {
      // ... properti lainnya
      contentType: 'text' | 'bunny'; // Hapus 'youtube'
      // ... properti lainnya
    }
    ```
-   Jika ada tipe atau field lain yang khusus untuk YouTube (misalnya `sourceType`), hapus juga untuk menjaga kebersihan kode.

### Langkah 3.2: Refactor Total Komponen `VideoPlayer.tsx`

Ini adalah bagian inti dari migrasi. Komponen ini akan disederhanakan secara drastis.

1.  **Hapus Logika Spesifik YouTube:**
    -   Hapus `useState` untuk `ytPlayer`.
    -   Hapus `useMemo` untuk `youtubeVideoId`.
    -   Hapus fungsi `getYouTubeId()`.
    -   Hapus seluruh blok `useEffect` yang bertanggung jawab untuk menginisialisasi YouTube Player, termasuk logika untuk menginjeksi script `iframe_api`.
    -   Hapus fungsi `onPlayerStateChange()`. Logika untuk menandai video selesai sekarang sepenuhnya ditangani oleh `handleLessonEnd` dan `handleTimeUpdate` yang sudah generik dan digunakan oleh `BunnyPlayer`.

2.  **Sederhanakan Logika Render:**
    -   Modifikasi fungsi `renderPlayer()` (atau JSX kondisional di dalam `return`).
    -   Hapus `case 'youtube'` atau blok `if (lesson.contentType === 'youtube')`.
    -   Sekarang, logika hanya perlu menangani `bunny` dan `text`.

    Contoh `renderPlayer()` yang disederhanakan:
    ```tsx
    const renderPlayer = () => {
      switch (lesson.contentType) {
        case 'text':
          return (
            <div className="bg-white p-6 rounded-lg border">
              <MarkdownRenderer content={lesson.textContent || ''} />
            </div>
          );
        case 'bunny':
          return (
            <div className="relative w-full bg-black rounded-lg overflow-hidden" data-protected="true">
              <BunnyPlayer 
                videoId={lesson.url}
                onEnded={handleLessonEnd}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>
          );
        default:
          return <p>Tipe konten tidak didukung.</p>;
      }
    };
    ```

### Langkah 3.3: Finalisasi dan Pembersihan Kode

-   Tinjau kembali `VideoPlayer.tsx` untuk menghapus impor, variabel, atau komentar sisa yang tidak lagi digunakan yang merujuk pada YouTube.
-   Pastikan tidak ada lagi referensi ke `window.YT` di seluruh proyek.
-   Jika ada *dependency* di `package.json` yang terkait khusus dengan YouTube (meskipun saat ini tidak ada), hapus dengan `npm uninstall`.

## 4. Rencana Pengujian Pasca-Migrasi

Setelah semua perubahan kode diimplementasikan, lakukan siklus pengujian yang ketat.

1.  **Pengujian Fungsional:**
    -   Buka pelajaran yang sebelumnya menggunakan video YouTube. Pastikan video tersebut sekarang diputar melalui `BunnyPlayer`.
    -   Verifikasi bahwa progres video (penandaan 90% selesai) dan event `onEnded` berfungsi dengan benar.
    -   Uji fungsionalitas "Selesai & Lanjut" untuk memastikan alur belajar tetap lancar.

2.  **Pengujian Kompatibilitas:**
    -   **Browser:** Lakukan pengujian di browser utama (Chrome, Firefox, Edge) dan yang paling penting **Safari** untuk memastikan HLS fallback native berfungsi tanpa `hls.js`.
    -   **Mobile (Capacitor):** Build aplikasi untuk Android (dan iOS jika memungkinkan). Uji pemutaran video secara menyeluruh di lingkungan WebView untuk memastikan tidak ada masalah terkait `localhost` atau izin.

3.  **Pengujian Performa:**
    -   Perhatikan waktu muat video. Seharusnya sebanding atau lebih cepat dari sebelumnya.
    -   Pantau penggunaan memori jika memungkinkan, pastikan tidak ada kebocoran memori setelah refactor.

## 5. Strategi Penerapan (Deployment)

1.  **Staging:** Terapkan semua perubahan ke lingkungan *staging* terlebih dahulu.
2.  **UAT (User Acceptance Testing):** Minta beberapa pengguna atau tim internal untuk menguji alur pembelajaran di lingkungan *staging*.
3.  **Produksi:** Setelah semua pengujian berhasil dan disetujui, terapkan perubahan ke lingkungan produksi. Pantau log dan umpan balik pengguna secara ketat setelah penerapan.
