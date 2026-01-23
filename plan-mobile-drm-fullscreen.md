# Rencana Implementasi DRM Mobile & Force Fullscreen

Dokumen ini menguraikan rencana teknis untuk meningkatkan keamanan pemutaran video di perangkat mobile dengan mengimplementasikan DRM secara efektif dan memberlakukan aturan pemutaran fullscreen.

## Tujuan Utama

1.  **Memaksimalkan Proteksi DRM di Mobile:** Memastikan bahwa teknologi DRM dari VdoCipher berjalan seefektif mungkin di platform mobile (Android & iOS) untuk mencegah tangkapan layar.
2.  **Menerapkan Aturan "Force Fullscreen":** Memaksa video untuk hanya bisa diputar ketika pengguna masuk ke dalam mode fullscreen. Video akan otomatis berhenti jika pengguna keluar dari mode fullscreen.

---

## Latar Belakang Masalah

Berdasarkan pengujian sebelumnya, ditemukan bahwa DRM VdoCipher (dan DRM pada umumnya) memiliki efektivitas tertinggi dalam mode fullscreen. Pada beberapa kombinasi OS dan browser, tangkapan layar masih bisa dilakukan jika video diputar dalam mode window (tidak fullscreen). Strategi "Force Fullscreen" adalah solusi untuk mengatasi batasan teknologi ini.

---

## Rencana Implementasi Teknis

### Bagian 1: Modifikasi Komponen Player Inti (`VdoCipherPlayer.tsx`)

Komponen ini akan menjadi pusat dari semua perubahan logika.

-   **Langkah 1.1: Tambahkan Overlay & Tombol Play.**
    -   Secara default, `VdoCipherPlayer` tidak akan langsung memuat atau menampilkan video.
    -   Sebagai gantinya, ia akan menampilkan sebuah *thumbnail* atau *placeholder* hitam dengan ikon "Play" besar di tengahnya.

-   **Langkah 1.2: Buat Event Handler untuk Tombol Play.**
    -   Ketika pengguna menekan tombol "Play", sebuah fungsi akan dipanggil.

-   **Langkah 1.3: Implementasikan Fullscreen API.**
    -   Fungsi dari langkah 1.2 akan menggunakan **Fullscreen API** dari browser (`element.requestFullscreen()`) pada `div` yang membungkus pemutar video.

-   **Langkah 1.4: Inisialisasi & Putar Video.**
    -   Setelah browser berhasil masuk ke mode fullscreen, kita akan memulai pemutaran video. Ini dapat dilakukan dengan memanggil metode `.play()` yang disediakan oleh VdoCipher Player API.

-   **Langkah 1.5: Tangani Keluar dari Fullscreen.**
    -   Tambahkan *event listener* pada document untuk mendeteksi event `fullscreenchange`.
    -   Ketika event ini terpicu dan `document.fullscreenElement` bernilai `null` (artinya pengguna telah keluar dari mode fullscreen), secara otomatis panggil metode `.pause()` pada video player.

### Bagian 2: Penyesuaian UI di Pemutar Mobile (`LessonPlayerMobile.tsx`)

-   **Langkah 2.1: Pastikan Kompatibilitas UI.**
    -   Komponen `LessonPlayerMobile.tsx` sudah menggunakan `VdoCipherPlayer`. Kita perlu memastikan bahwa UI di sekitarnya tidak bertabrakan dengan alur "klik untuk fullscreen" yang baru.
    -   Kontrol video kustom yang ada (seperti play/pause manual di `LessonPlayerMobile`) mungkin perlu disembunyikan atau disesuaikan karena kontrol utama sekarang akan ditangani oleh VdoCipher Player di mode fullscreen.

### Bagian 3: Pengujian Menyeluruh

Setelah implementasi selesai, lakukan pengujian pada skenario berikut:

1.  **Pengujian Fungsional:**
    -   [ ] Buka halaman pelajaran di Android (via Chrome).
    -   [ ] Buka halaman pelajaran di iOS (via Safari).
    -   [ ] Pastikan video tidak bisa diputar sebelum menekan tombol "Play" dan masuk ke mode fullscreen.
    -   [ ] Pastikan video otomatis berhenti ketika keluar dari mode fullscreen.

2.  **Pengujian Keamanan:**
    -   [ ] Saat video diputar (dalam mode fullscreen) di Android, coba lakukan tangkapan layar. **Hasil yang diharapkan: layar menjadi hitam atau gagal.**
    -   [ ] Saat video diputar (dalam mode fullscreen) di iOS, coba lakukan tangkapan layar. **Hasil yang diharapkan: layar menjadi hitam atau gagal.**

---

## Kesimpulan

Implementasi ini memprioritaskan **keamanan konten** di atas **fleksibilitas pengguna**. Meskipun mengurangi kenyamanan karena tidak bisa menonton dalam mode window, pendekatan ini secara signifikan meningkatkan perlindungan terhadap pembajakan konten melalui tangkapan atau rekaman layar di perangkat mobile.
