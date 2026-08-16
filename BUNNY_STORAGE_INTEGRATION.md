# Bunny.net Storage & CDN Integration Guide

This document outlines the architecture, setup, and maintenance of the **Bunny.net Storage & CDN** system, which replaces Firebase Storage as the primary file hosting engine for E-Learning Internasional Komputer.

---

## 🏗️ System Architecture

To maintain high security, the application uses a **server-side upload proxy**. This prevents the Bunny.net Master Access Key from being exposed to client browsers.

```
┌─────────────────┐       File & Folder      ┌─────────────────┐       PUT Request       ┌──────────────────────┐
│  Admin Browser  │ ───────────────────────> │  Next.js Server │ ──────────────────────> │  Bunny.net Storage   │
│ (React Client)  │   POST /api/upload       │  (Route Handler)│   with AccessKey Header │  (Files & Videos)    │
└─────────────────┘                          └─────────────────┘                         └──────────────────────┘
         ▲                                                                                          │
         │                                   Delivers Assets                                        ▼
         └─────────────────────────────────────────────────────────────────────────────────── ┌──────────────────────┐
                                           https://alfajr-cdn.b-cdn.net/                      │  Bunny.net CDN       │
                                                                                              │  (Global Edge Pull)  │
                                                                                              └──────────────────────┘
```

---

## 📂 Key Files & Endpoints

### 1. Upload API Proxy: `/api/upload`
*   **Location**: `app/api/upload/route.ts`
*   **Purpose**: Receives files from client components, sanitizes the filenames (removes spaces/special characters), uploads them to Bunny.net Storage, and returns the Bunny CDN public URL.
*   **Security**: Uses server-side variables `BUNNY_STORAGE_ACCESS_KEY` and `BUNNY_STORAGE_ZONE_NAME`.

### 2. Video Streaming Proxy: `/api/video/stream`
*   **Location**: `app/api/video/stream/route.ts`
*   **Purpose**: Proxies video streaming and handles Range Requests for seamless scrubbing/seeking.
*   **Pembaruan**: Telah diperbarui untuk memasukkan domain Bunny CDN (`*.b-cdn.net` dan host kustom) ke dalam *Allowed Hosts* agar video dapat diputar dan di-scrub secara native di pemutar web dan PWA Android.

### 3. File & Image Uploader: `FileUploader`
*   **Location**: `components/admin/FileUploader.tsx`
*   **Purpose**: Renders file selector for thumbnails, course covers, and PDF attachments. Communicates with `/api/upload` via `XMLHttpRequest` to support real-time progress bars and upload cancel aborts.

### 4. Video Compressor & Uploader: `VideoCompressorUploader`
*   **Location**: `components/admin/VideoCompressorUploader.tsx`
*   **Purpose**: Compresses video files using `FFmpeg.wasm` inside the admin's browser before proxying them to Bunny.net. This reduces upload bandwidth requirements.

### 5. Article & Markdown Editor: `RichTextEditor`
*   **Location**: `components/admin/RichTextEditor.tsx`
*   **Purpose**: Markdown editor for course articles with integrated Bunny.net media support.
*   **Fitur Premium**:
    *   **Klik Gambar**: Mengunggah gambar ke Bunny.net dan menyisipkan format Markdown `![nama](url)` secara otomatis.
    *   **Drag & Drop**: Seret file gambar dari komputer lalu lepas di editor untuk langsung mengunggah dan menyisipkan ilustrasi.
    *   **Loading Overlay**: Efek loading transparan dengan animasi spinner selama proses unggah berlangsung.

---

## ⚙️ Environment Variables (.env)

Ensure the following variables are configured in the staging/production `.env` file:

```env
BUNNY_STORAGE_ZONE_NAME="alfajr-storage"
BUNNY_STORAGE_ACCESS_KEY="your-storage-zone-password"
BUNNY_STORAGE_REGION="storage.bunnycdn.com"
BUNNY_CDN_HOSTNAME="alfajr-cdn.b-cdn.net"
```

---

## 🛠️ Maintenance & Backup Scripts

Located in the `scripts/` directory:

### 1. Database Backup & Disaster Recovery
*   **Backup**: `node scripts/backup-firestore.js`
    *   Saves the entire Firestore database state to `firestore_backup.json` (git-ignored).
*   **Restore**: `node scripts/restore-firestore.js`
    *   Restores the `courses` collection back to its original state from `firestore_backup.json` in case of migration issues.

### 2. APK Compiler Uploader
*   **Upload APK**: `node scripts/upload-apk.js`
    *   Uploads a new build of the Android installer from `public/alfajr-elearning.apk` directly to Bunny.net. The download links inside the app are automatically pointed to `https://alfajr-cdn.b-cdn.net/alfajr-elearning.apk`.

### 3. Video Batch Compres (Offline Utility)
*   **Compress local files**: `node scripts/compress-videos.js`
    *   Locally batch compresses raw videos using FFmpeg with `ultrafast` preset and optimal E-learning configurations to prepare them for uploading. Automatically skips already compressed files.

---

© 2026 E-Learning Internasional Komputer - Bunny.net Integration Documentation
