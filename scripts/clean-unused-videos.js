/**
 * ============================================================================
 * 🧹 CLEAN UNUSED VIDEOS (BUNNY STREAM & BUNNY STORAGE)
 * ============================================================================
 * Skrip ini memindai database Firestore dan membandingkannya dengan aset yang ada
 * di Bunny Stream (Library Video) dan Bunny Storage (Folder videos/).
 * 
 * 🛡️ PENGAMAN (SAFETY FIRST):
 * 1. Default mode: DRY_RUN = true (HANYA SIMULASI & AUDIT, TIDAK MENGHAPUS APAPUN).
 * 2. Menyimpan laporan audit lengkap ke file: 'scripts/unused_videos_report.json'.
 * 3. Grace Period: Melewati file/video yang baru diunggah (< 24 jam) agar aman.
 * 4. Proteksi Scope: Hanya memeriksa folder 'videos/' dan library Bunny Stream.
 *    (File APK, cover image, thumbnail, dan lampiran PDF tidak akan disentuh).
 * 
 * 📌 CARA PENGGUNAAN:
 * - Simulasi (Dry Run):   node scripts/clean-unused-videos.js
 * - Eksekusi Hapus Live:  node scripts/clean-unused-videos.js --delete
 * ============================================================================
 */

const admin = require('firebase-admin');
const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

// ============================================================================
// ⚙️ KONFIGURASI
// ============================================================================
// Cek argumen CLI (--delete untuk live delete)
const isDeleteArgPassed = process.argv.includes('--delete') || process.argv.includes('--confirm');
const DRY_RUN = !isDeleteArgPassed; // Default: TRUE (Simulasi)

// Grace Period dalam Jam: Video yang diunggah kurang dari X jam lalu TIDAK akan dihapus
const GRACE_PERIOD_HOURS = 24;

// 1. Validasi Firebase Admin Config
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

// 2. Validasi Bunny Storage
const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
const bunnyStorageRegionRaw = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com';
const bunnyStorageRegion = bunnyStorageRegionRaw.split(/\s+/)[0];

// 3. Validasi Bunny Stream (Video Library)
const bunnyStreamLibraryId = process.env.BUNNY_STREAM_LIBRARY_ID ? process.env.BUNNY_STREAM_LIBRARY_ID.replace(/\D/g, '') : '';
const bunnyStreamApiKey = process.env.BUNNY_STREAM_API_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Error: Konfigurasi Firebase tidak lengkap di .env (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
  process.exit(1);
}

// Inisialisasi Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}
const db = admin.firestore();

// Helper Request HTTPS
function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, data });
          }
        } else {
          resolve({ error: true, statusCode: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// ============================================================================
// 1. FETCH & SCAN FIRESTORE REFERENCES
// ============================================================================
async function fetchAllFirestoreReferences() {
  console.log('🔍 [1/4] Memindai seluruh referensi video di Firestore...');
  
  const activeStreamGuids = new Set();
  const activeStorageFilenames = new Set();
  const activeUrls = new Set();
  const matchedLessons = [];

  // Helper untuk mengekstrak URL atau GUID
  const registerUrl = (rawUrl, context) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const url = rawUrl.trim();
    activeUrls.add(url);

    // 1. Bunny Stream format: bunny-stream://{libraryId}/{guid}
    if (url.startsWith('bunny-stream://')) {
      const parts = url.replace('bunny-stream://', '').split('/');
      if (parts[1]) {
        activeStreamGuids.add(parts[1].toLowerCase());
        matchedLessons.push({ type: 'stream', guid: parts[1], context });
      }
    }
    // Jika format URL iframe embed Bunny: https://iframe.mediadelivery.net/embed/{libraryId}/{guid}
    else if (url.includes('mediadelivery.net/embed/')) {
      const match = url.match(/\/embed\/\d+\/([a-zA-Z0-9-]+)/);
      if (match && match[1]) {
        activeStreamGuids.add(match[1].toLowerCase());
        matchedLessons.push({ type: 'stream', guid: match[1], context });
      }
    }
    // Jika format URL Bunny Storage / CDN / Firebase Storage
    else {
      // Ekstrak nama file (misal: 1783420180405-opt-sample-5s.mp4)
      const urlDecoded = decodeURIComponent(url);
      const filenameMatch = urlDecoded.match(/([^/?#]+)(?:\?.*)?$/);
      if (filenameMatch && filenameMatch[1]) {
        activeStorageFilenames.add(filenameMatch[1].toLowerCase());
      }
      matchedLessons.push({ type: 'storage/url', url, context });
    }
  };

  // Pindai koleksi 'courses'
  const coursesSnapshot = await db.collection('courses').get();
  console.log(`   📚 Memeriksa ${coursesSnapshot.size} dokumen courses...`);

  coursesSnapshot.forEach(doc => {
    const course = doc.data();
    const courseTitle = course.title || doc.id;

    // Cover Image & Thumbnail
    registerUrl(course.coverImage, `Course "${courseTitle}" (coverImage)`);
    registerUrl(course.thumbnail, `Course "${courseTitle}" (thumbnail)`);

    // Sections & Lessons
    if (Array.isArray(course.sections)) {
      course.sections.forEach((section, sIdx) => {
        if (Array.isArray(section.lessons)) {
          section.lessons.forEach((lesson, lIdx) => {
            const lessonCtx = `Course "${courseTitle}" -> Sec ${sIdx + 1} "${section.title}" -> Lesson "${lesson.title}"`;
            
            registerUrl(lesson.url, `${lessonCtx} (url)`);
            registerUrl(lesson.videoUrl, `${lessonCtx} (videoUrl)`);
            registerUrl(lesson.attachmentUrl, `${lessonCtx} (attachmentUrl)`);
            registerUrl(lesson.thumbnail, `${lessonCtx} (thumbnail)`);
            registerUrl(lesson.thumbnailUrl, `${lessonCtx} (thumbnailUrl)`);

            // Pindai juga teks Markdown jika ada URL yang disematkan di artikel
            if (lesson.textContent && typeof lesson.textContent === 'string') {
              const urlMatches = lesson.textContent.match(/https?:\/\/[^\s'")]+/g);
              if (urlMatches) {
                urlMatches.forEach(u => registerUrl(u, `${lessonCtx} (textContent embed)`));
              }
              const bunnyStreamMatches = lesson.textContent.match(/bunny-stream:\/\/[^\s'")]*/g);
              if (bunnyStreamMatches) {
                bunnyStreamMatches.forEach(u => registerUrl(u, `${lessonCtx} (textContent embed)`));
              }
            }
          });
        }
      });
    }
  });

  console.log(`   ✅ Selesai: Ditemukan ${activeStreamGuids.size} Bunny Stream GUID aktif & ${activeStorageFilenames.size} file nama aktif.`);
  return { activeStreamGuids, activeStorageFilenames, activeUrls };
}

// ============================================================================
// 2. BUNNY STREAM AUDIT & CLEANUP
// ============================================================================
async function auditBunnyStream(activeStreamGuids) {
  console.log('\n🔍 [2/4] Memindai daftar video di Bunny Stream Library...');
  
  if (!bunnyStreamLibraryId || !bunnyStreamApiKey) {
    console.log('   ⚠️ BUNNY_STREAM_LIBRARY_ID atau BUNNY_STREAM_API_KEY tidak ditemukan di .env. Melewati Bunny Stream.');
    return { allVideos: [], unusedVideos: [], activeVideos: [] };
  }

  let page = 1;
  const allVideos = [];
  
  while (true) {
    const url = `https://video.bunnycdn.com/library/${bunnyStreamLibraryId}/videos?page=${page}&itemsPerPage=100`;
    const parsed = new URL(url);
    const res = await httpsRequest({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'AccessKey': bunnyStreamApiKey,
        'Accept': 'application/json'
      }
    });

    if (res.error || !res.data?.items || res.data.items.length === 0) {
      break;
    }
    allVideos.push(...res.data.items);
    if (allVideos.length >= (res.data.totalItems || 0) || res.data.items.length < 100) {
      break;
    }
    page++;
  }

  console.log(`   🎬 Ditemukan total ${allVideos.length} video di Bunny Stream.`);

  const now = new Date();
  const unusedVideos = [];
  const activeVideos = [];
  const skippedRecentVideos = [];

  allVideos.forEach(v => {
    const guid = (v.guid || '').toLowerCase();
    const isUsed = activeStreamGuids.has(guid);

    // Cek umur video (Grace Period)
    const uploadDate = new Date(v.dateUploaded);
    const ageInHours = (now - uploadDate) / (1000 * 60 * 60);

    if (isUsed) {
      activeVideos.push(v);
    } else {
      if (ageInHours < GRACE_PERIOD_HOURS) {
        skippedRecentVideos.push({ ...v, ageInHours: ageInHours.toFixed(1) });
      } else {
        unusedVideos.push(v);
      }
    }
  });

  return { allVideos, unusedVideos, activeVideos, skippedRecentVideos };
}

async function deleteBunnyStreamVideo(videoId) {
  const url = `https://video.bunnycdn.com/library/${bunnyStreamLibraryId}/videos/${videoId}`;
  const parsed = new URL(url);
  return httpsRequest({
    hostname: parsed.hostname,
    path: parsed.pathname,
    method: 'DELETE',
    headers: {
      'AccessKey': bunnyStreamApiKey,
      'Accept': 'application/json'
    }
  });
}

// ============================================================================
// 3. BUNNY STORAGE AUDIT & CLEANUP (Folder: videos/)
// ============================================================================
async function auditBunnyStorage(activeStorageFilenames, activeUrls) {
  console.log('\n🔍 [3/4] Memindai daftar file di Bunny Storage (folder videos/)...');
  
  if (!bunnyStorageZoneName || !bunnyStorageAccessKey) {
    console.log('   ⚠️ BUNNY_STORAGE_ZONE_NAME atau BUNNY_STORAGE_ACCESS_KEY tidak ditemukan di .env. Melewati Bunny Storage.');
    return { allFiles: [], unusedFiles: [], activeFiles: [] };
  }

  const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/videos/`;
  const parsed = new URL(url);
  const res = await httpsRequest({
    hostname: parsed.hostname,
    path: parsed.pathname,
    method: 'GET',
    headers: {
      'AccessKey': bunnyStorageAccessKey,
      'Accept': 'application/json'
    }
  });

  const files = Array.isArray(res.data) ? res.data : [];
  console.log(`   📁 Ditemukan total ${files.length} file di Bunny Storage folder "videos/".`);

  const now = new Date();
  const unusedFiles = [];
  const activeFiles = [];
  const skippedRecentFiles = [];

  files.forEach(file => {
    if (file.IsDirectory) return;

    const fileName = (file.ObjectName || '').toLowerCase();
    
    // Cek apakah file dipakai di database
    let isUsed = activeStorageFilenames.has(fileName);
    if (!isUsed) {
      for (const u of activeUrls) {
        if (u.toLowerCase().includes(fileName)) {
          isUsed = true;
          break;
        }
      }
    }

    const lastChanged = new Date(file.LastChanged);
    const ageInHours = (now - lastChanged) / (1000 * 60 * 60);

    if (isUsed) {
      activeFiles.push(file);
    } else {
      if (ageInHours < GRACE_PERIOD_HOURS) {
        skippedRecentFiles.push({ ...file, ageInHours: ageInHours.toFixed(1) });
      } else {
        unusedFiles.push(file);
      }
    }
  });

  return { allFiles: files, unusedFiles, activeFiles, skippedRecentFiles };
}

async function deleteBunnyStorageFile(fileName) {
  const sanitized = fileName.replace(/^\//, '');
  const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/videos/${encodeURIComponent(sanitized)}`;
  const parsed = new URL(url);
  return httpsRequest({
    hostname: parsed.hostname,
    path: parsed.pathname,
    method: 'DELETE',
    headers: {
      'AccessKey': bunnyStorageAccessKey,
      'Accept': 'application/json'
    }
  });
}

// ============================================================================
// 4. MAIN ORCHESTRATOR
// ============================================================================
async function run() {
  console.log('=================================================================');
  console.log(`🧹 PEMBERSIH VIDEO TIDAK TERPAKAI (BUNNY STREAM & STORAGE)`);
  console.log(`   Status Mode: ${DRY_RUN ? '🛡️ DRY RUN (SIMULASI / HANYA AUDIT)' : '⚠️ LIVE MODE (PENGHAPUSAN AKTIF)'}`);
  console.log(`   Grace Period: File baru (< ${GRACE_PERIOD_HOURS} jam) otomatis dilindungi`);
  console.log('=================================================================');

  // 1. Ekstraksi Firestore
  const { activeStreamGuids, activeStorageFilenames, activeUrls } = await fetchAllFirestoreReferences();

  // 2. Audit Bunny Stream
  const streamResult = await auditBunnyStream(activeStreamGuids);

  // 3. Audit Bunny Storage
  const storageResult = await auditBunnyStorage(activeStorageFilenames, activeUrls);

  // Hitung Ukuran & Ringkasan
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  let totalUnusedStreamBytes = streamResult.unusedVideos.reduce((sum, v) => sum + (v.storageSize || 0), 0);
  let totalUnusedStorageBytes = streamResult.unusedFiles ? 0 : storageResult.unusedFiles.reduce((sum, f) => sum + (f.Length || 0), 0);

  console.log('\n=================================================================');
  console.log(`📊 LAPORAN HASIL AUDIT MEDIA`);
  console.log('=================================================================');
  console.log(`🎬 1. BUNNY STREAM (Adaptive DRM Streaming):`);
  console.log(`   - Total Video di Library:     ${streamResult.allVideos.length}`);
  console.log(`   - Video Aktif di Website:     ${streamResult.activeVideos.length}`);
  console.log(`   - Video Baru (Grace Period):  ${streamResult.skippedRecentVideos?.length || 0}`);
  console.log(`   - ❌ Video Gak Kepake (Orphan): ${streamResult.unusedVideos.length} (${formatBytes(totalUnusedStreamBytes)})`);
  
  console.log(`\n📁 2. BUNNY STORAGE (Folder "videos/"):`);
  console.log(`   - Total File di Folder:       ${storageResult.allFiles.length}`);
  console.log(`   - File Aktif di Website:      ${storageResult.activeFiles.length}`);
  console.log(`   - File Baru (Grace Period):   ${storageResult.skippedRecentFiles?.length || 0}`);
  console.log(`   - ❌ File Gak Kepake (Orphan):  ${storageResult.unusedFiles.length} (${formatBytes(totalUnusedStorageBytes)})`);

  console.log(`\n💾 TOTAL KAPASITAS YANG BISA DIHEMAT: ${formatBytes(totalUnusedStreamBytes + totalUnusedStorageBytes)}`);
  console.log('=================================================================');

  // Export Laporan ke JSON agar bisa ditinjau manual
  const reportPath = path.join(__dirname, 'unused_videos_report.json');
  const reportData = {
    generatedAt: new Date().toISOString(),
    mode: DRY_RUN ? 'DRY_RUN' : 'LIVE_DELETE',
    summary: {
      totalPotentialSavings: formatBytes(totalUnusedStreamBytes + totalUnusedStorageBytes),
      stream: {
        total: streamResult.allVideos.length,
        active: streamResult.activeVideos.length,
        unused: streamResult.unusedVideos.length,
        unusedSize: formatBytes(totalUnusedStreamBytes)
      },
      storage: {
        total: storageResult.allFiles.length,
        active: storageResult.activeFiles.length,
        unused: storageResult.unusedFiles.length,
        unusedSize: formatBytes(totalUnusedStorageBytes)
      }
    },
    unusedStreamVideos: streamResult.unusedVideos.map(v => ({
      guid: v.guid,
      title: v.title,
      views: v.views,
      storageSize: formatBytes(v.storageSize),
      dateUploaded: v.dateUploaded
    })),
    unusedStorageFiles: storageResult.unusedFiles.map(f => ({
      name: f.ObjectName,
      size: formatBytes(f.Length),
      lastChanged: f.LastChanged
    }))
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`\n📄 Laporan detail telah disimpan ke: ${reportPath}`);

  // ============================================================================
  // EKSEKUSI PENGHAPUSAN (JIKA LIVE MODE)
  // ============================================================================
  if (DRY_RUN) {
    console.log(`\n🛡️ SIMULASI SELESAI (DRY RUN):`);
    console.log(`   Tidak ada video yang dihapus.`);
    console.log(`   Silakan buka file 'scripts/unused_videos_report.json' untuk memeriksa daftar video.`);
    console.log(`   Jika sudah yakin, jalankan perintah berikut untuk menghapus permanen:`);
    console.log(`   👉 node scripts/clean-unused-videos.js --delete\n`);
  } else {
    console.log(`\n⚠️ MEMULAI PENGHAPUSAN PERMANEN...`);
    
    // 1. Hapus Video di Bunny Stream
    if (streamResult.unusedVideos.length > 0) {
      console.log(`\n🗑️ [1/2] Menghapus ${streamResult.unusedVideos.length} video di Bunny Stream...`);
      let deletedStreamCount = 0;
      for (const v of streamResult.unusedVideos) {
        try {
          const res = await deleteBunnyStreamVideo(v.guid);
          if (!res.error) {
            console.log(`   ✅ Dihapus [Stream]: "${v.title}" (${v.guid})`);
            deletedStreamCount++;
          } else {
            console.error(`   ❌ Gagal [Stream]: "${v.title}" (${v.guid}) - Status: ${res.statusCode}`);
          }
        } catch (e) {
          console.error(`   ❌ Gagal [Stream]: "${v.title}" - ${e.message}`);
        }
      }
      console.log(`   🏁 Berhasil menghapus ${deletedStreamCount}/${streamResult.unusedVideos.length} video di Bunny Stream.`);
    }

    // 2. Hapus File di Bunny Storage
    if (storageResult.unusedFiles.length > 0) {
      console.log(`\n🗑️ [2/2] Menghapus ${storageResult.unusedFiles.length} file di Bunny Storage (videos/)...`);
      let deletedStorageCount = 0;
      for (const f of storageResult.unusedFiles) {
        try {
          const res = await deleteBunnyStorageFile(f.ObjectName);
          if (!res.error) {
            console.log(`   ✅ Dihapus [Storage]: "${f.ObjectName}"`);
            deletedStorageCount++;
          } else {
            console.error(`   ❌ Gagal [Storage]: "${f.ObjectName}" - Status: ${res.statusCode}`);
          }
        } catch (e) {
          console.error(`   ❌ Gagal [Storage]: "${f.ObjectName}" - ${e.message}`);
        }
      }
      console.log(`   🏁 Berhasil menghapus ${deletedStorageCount}/${storageResult.unusedFiles.length} file di Bunny Storage.`);
    }

    console.log(`\n🎉 PROSES PEMBERSIHAN SELESAI SEMPURNA!`);
  }
}

run()
  .catch(err => console.error('❌ Terjadi kesalahan fatal:', err))
  .finally(() => process.exit(0));
