const admin = require('firebase-admin');
const https = require('https');
require('dotenv').config({ path: '.env' });

// 1. Validate and Sanitize Environment Variables
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
const bunnyStorageRegionRaw = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com';
const bunnyStorageRegion = bunnyStorageRegionRaw.split(/\s+/)[0];

const bunnyCdnHostnameRaw = process.env.BUNNY_CDN_HOSTNAME;
const bunnyCdnHostname = bunnyCdnHostnameRaw ? bunnyCdnHostnameRaw.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.error('❌ Missing Firebase configuration variables in .env');
  process.exit(1);
}

if (!bunnyStorageZoneName || !bunnyStorageAccessKey || !bunnyCdnHostname) {
  console.error('❌ Missing Bunny.net configuration in .env');
  process.exit(1);
}

// 2. Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  storageBucket: bucketName
});

const db = admin.firestore();

// =========================================================================
// ⚙️ KONFIGURASI KEAMANAN (DRY RUN MODE)
// =========================================================================
// - true: Hanya simulasi. Skrip akan memindai dan mencatat semua perubahan di konsol,
//         TETAPI tidak menulis perubahan apa pun ke database Firestore.
// - false: LIVE MODE. Skrip akan langsung memperbarui data di Firestore secara permanen.
// =========================================================================
const DRY_RUN = false;

/**
 * Mendapatkan daftar file di dalam folder tertentu di Bunny.net Storage
 */
function listBunnyFiles(folderPath = '') {
  return new Promise((resolve) => {
    const sanitizedPath = folderPath.replace(/^\//, '').replace(/\\/g, '/');
    const encodedPath = sanitizedPath ? sanitizedPath.split('/').map(encodeURIComponent).join('/') + '/' : '';
    const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${encodedPath}`;

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'GET',
      headers: {
        'AccessKey': bunnyStorageAccessKey,
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const files = JSON.parse(body);
            resolve(files);
          } catch (e) {
            resolve([]);
          }
        } else {
          resolve([]);
        }
      });
    });

    req.on('error', () => {
      resolve([]);
    });

    req.end();
  });
}

/**
 * Scan seluruh file di Bunny.net secara rekursif (untuk folder yang kita gunakan)
 */
async function scanAllBunnyFiles() {
  console.log('🔍 Memindai file yang ada di Bunny.net Storage...');
  
  // Folder-folder utama yang kita gunakan di Bunny
  const foldersToScan = [
    '', // Root folder (untuk file apk, dll)
    'attachments/',
    'course-covers/',
    'course-thumbnails/',
    'files/',
    'images/',
    'videos/'
  ];

  const bunnyFilesSet = new Set();

  for (const folder of foldersToScan) {
    const files = await listBunnyFiles(folder);
    files.forEach(file => {
      if (!file.IsDirectory) {
        // Gabungkan path folder dengan nama file (misal: "videos/video1.mp4")
        const fullPath = folder + file.ObjectName;
        bunnyFilesSet.add(fullPath.replace(/\\/g, '/').toLowerCase());
      }
    });
  }

  return bunnyFilesSet;
}

/**
 * Mengekstrak nama file dan folder path dari URL Firebase
 */
function getStoragePathFromFirebaseUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (url.includes('firebasestorage.googleapis.com')) {
    const match = url.match(/\/o\/([^?]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return null;
}

async function migrateFirestoreUrls() {
  try {
    console.log('=========================================');
    console.log(`🎬 MEMULAI MIGRASI URL DENGAN VERIFIKASI BUNNY.NET`);
    console.log(`   Mode: ${DRY_RUN ? '🛡️ DRY RUN (SIMULASI - AMAN)' : '⚠️ LIVE MODE (MENULIS KE FIRESTORE)'}`);
    console.log('=========================================');

    // 1. Scan semua file di Bunny.net Storage
    const bunnyFiles = await scanAllBunnyFiles();
    console.log(`✅ Selesai memindai. Ditemukan ${bunnyFiles.size} file aktif di Bunny.net Storage.\n`);

    // 2. Baca data dari Firestore
    console.log('🔍 Membaca data "courses" dari Firestore...');
    const coursesSnapshot = await db.collection('courses').get();
    console.log(`📚 Ditemukan ${coursesSnapshot.size} dokumen course.`);

    let totalCoursesUpdated = 0;
    let totalUrlsChanged = 0;
    let totalWarnings = 0;

    for (const doc of coursesSnapshot.docs) {
      const courseData = doc.data();
      let isUpdated = false;
      const changesList = [];
      const warningsList = [];

      // Helper untuk verifikasi dan konversi URL
      const verifyAndConvert = (urlField, label) => {
        if (!urlField) return null;
        
        const storagePath = getStoragePathFromFirebaseUrl(urlField);
        if (storagePath) {
          // Cek apakah path file ini ada di Bunny.net
          if (bunnyFiles.has(storagePath.toLowerCase())) {
            const newUrl = `https://${bunnyCdnHostname}/${storagePath}`;
            changesList.push(`   [${label}] URL Diperbarui:`);
            changesList.push(`     Sebelum: ${urlField}`);
            changesList.push(`     Sesudah: ${newUrl}`);
            totalUrlsChanged++;
            return newUrl;
          } else {
            warningsList.push(`   [${label}] ⚠️ WARNING: File "${storagePath}" TIDAK DITEMUKAN di Bunny.net! (Dilewati)`);
            totalWarnings++;
          }
        }
        return null;
      };

      // A. Cek Cover Image
      if (courseData.coverImage) {
        const newUrl = verifyAndConvert(courseData.coverImage, 'Cover Image');
        if (newUrl) {
          courseData.coverImage = newUrl;
          isUpdated = true;
        }
      }

      // B. Cek Thumbnail
      if (courseData.thumbnail) {
        const newUrl = verifyAndConvert(courseData.thumbnail, 'Course Thumbnail');
        if (newUrl) {
          courseData.thumbnail = newUrl;
          isUpdated = true;
        }
      }

      // C. Cek Video, Attachment, dan Thumbnail di setiap Lesson
      if (Array.isArray(courseData.sections)) {
        courseData.sections.forEach((section) => {
          if (Array.isArray(section.lessons)) {
            section.lessons.forEach((lesson) => {
              const fieldsToCheck = ['url', 'attachmentUrl', 'thumbnail', 'videoUrl', 'thumbnailUrl'];
              
              fieldsToCheck.forEach((field) => {
                if (lesson[field]) {
                  const label = `Section: "${section.title}" -> Lesson: "${lesson.title}" (${field})`;
                  const newUrl = verifyAndConvert(lesson[field], label);
                  if (newUrl) {
                    lesson[field] = newUrl;
                    isUpdated = true;
                  }
                }
              });
            });
          }
        });
      }

      // Tampilkan hasil pemindaian dokumen ini
      if (changesList.length > 0 || warningsList.length > 0) {
        console.log(`\n-----------------------------------------`);
        console.log(`📄 Analisis Dokumen Course: "${courseData.title}" (ID: ${doc.id})`);
        
        if (changesList.length > 0) {
          changesList.forEach(line => console.log(line));
        }
        
        if (warningsList.length > 0) {
          // Cetak warning
          warningsList.forEach(line => console.log(line));
        }

        if (isUpdated && !DRY_RUN) {
          // Tulis perubahan ke database jika LIVE MODE
          await db.collection('courses').doc(doc.id).update(courseData);
          console.log(`   ✅ Firestore berhasil diperbarui secara permanen.`);
          totalCoursesUpdated++;
        } else if (isUpdated) {
          totalCoursesUpdated++;
        }
      }
    }

    console.log(`\n=========================================`);
    console.log(`🏁 PROSES SELESAI!`);
    console.log(`📊 Ringkasan Laporan:`);
    console.log(`   - Jumlah course yang terpengaruh: ${totalCoursesUpdated}`);
    console.log(`   - Jumlah total URL yang diubah:  ${totalUrlsChanged}`);
    console.log(`   - Jumlah file yang tidak ditemukan di Bunny: ${totalWarnings}`);
    
    if (totalWarnings > 0) {
      console.log(`\n⚠️ PERHATIAN: Ditemukan ${totalWarnings} file di Firestore yang belum diunggah ke Bunny.net.`);
      console.log(`   Silakan unggah file tersebut terlebih dahulu sebelum melanjutkan.`);
    }

    if (DRY_RUN) {
      console.log(`\n💡 Ini adalah simulasi (DRY RUN). Tidak ada data yang diubah di Firestore.`);
      console.log(`   Ubah 'const DRY_RUN = true;' menjadi 'false' di file skrip jika Anda sudah siap melakukan migrasi asli.`);
    } else {
      console.log(`\n🎉 Data Firestore berhasil diperbarui secara permanen!`);
    }
    console.log(`=========================================`);

  } catch (error) {
    console.error('❌ Terjadi kesalahan fatal saat migrasi:', error);
  } finally {
    process.exit(0);
  }
}

migrateFirestoreUrls();
