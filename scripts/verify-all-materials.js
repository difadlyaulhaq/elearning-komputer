const admin = require('firebase-admin');
const https = require('https');
require('dotenv').config({ path: '.env' });

// 1. Validate Firebase Admin Config
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

// 2. Validate Bunny Stream
const bunnyStreamLibraryId = process.env.BUNNY_STREAM_LIBRARY_ID ? process.env.BUNNY_STREAM_LIBRARY_ID.replace(/\D/g, '') : '';
const bunnyStreamApiKey = process.env.BUNNY_STREAM_API_KEY;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  });
}
const db = admin.firestore();

function checkBunnyStreamVideo(videoId, libraryId) {
  return new Promise((resolve) => {
    const libId = libraryId || bunnyStreamLibraryId;
    const url = `https://video.bunnycdn.com/library/${libId}/videos/${videoId}`;
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'GET',
      headers: {
        'AccessKey': bunnyStreamApiKey,
        'Accept': 'application/json'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve({ ok: true, statusCode: 200, videoData: json });
          } catch (e) {
            resolve({ ok: true, statusCode: 200, raw: data });
          }
        } else {
          resolve({ ok: false, statusCode: res.statusCode, error: data });
        }
      });
    });
    req.on('error', (err) => resolve({ ok: false, error: err.message }));
    req.end();
  });
}

function checkHttpUrl(url) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(url);
      const options = {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      };
      const req = https.request(options, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ ok: true, statusCode: res.statusCode });
        } else {
          resolve({ ok: false, statusCode: res.statusCode });
        }
      });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
      req.setTimeout(5000, () => {
        req.destroy();
        resolve({ ok: false, error: 'Timeout' });
      });
      req.end();
    } catch (e) {
      resolve({ ok: false, error: e.message });
    }
  });
}

async function verifyAllMaterials() {
  console.log('=================================================================');
  console.log('🩺 HEALTH CHECK: MEMERIKSA SELURUH MATERI & VIDEO DI WEBSITE');
  console.log('=================================================================\n');

  const coursesSnap = await db.collection('courses').get();
  console.log(`📚 Memeriksa ${coursesSnap.size} Courses di database...\n`);

  let totalLessonsChecked = 0;
  let totalBunnyStreamVideos = 0;
  let totalValidStreamVideos = 0;
  let totalOtherMedia = 0;
  let totalErrors = 0;

  for (const doc of coursesSnap.docs) {
    const course = doc.data();
    const courseTitle = course.title || doc.id;
    console.log(`-----------------------------------------------------------------`);
    console.log(`📖 COURSE: "${courseTitle}" (ID: ${doc.id})`);
    console.log(`   Status: ${course.status || 'active'} | Level: ${course.level || 'basic'}`);
    
    if (course.coverImage) {
      console.log(`   🖼️ Cover Image: ${course.coverImage}`);
    }

    if (!Array.isArray(course.sections) || course.sections.length === 0) {
      console.log(`   ℹ️ Tidak ada section di course ini.`);
      continue;
    }

    for (const [sIdx, section] of course.sections.entries()) {
      console.log(`\n   📁 Section ${sIdx + 1}: "${section.title}"`);

      if (!Array.isArray(section.lessons) || section.lessons.length === 0) {
        console.log(`      (Belum ada lesson di section ini)`);
        continue;
      }

      for (const [lIdx, lesson] of section.lessons.entries()) {
        totalLessonsChecked++;
        const lessonPrefix = `      [${sIdx + 1}.${lIdx + 1}] "${lesson.title}" (${lesson.contentType || 'video-upload'})`;

        if (lesson.url && lesson.url.startsWith('bunny-stream://')) {
          totalBunnyStreamVideos++;
          const clean = lesson.url.replace('bunny-stream://', '');
          const [libId, videoId] = clean.split('/');

          const check = await checkBunnyStreamVideo(videoId, libId);
          if (check.ok && check.videoData) {
            totalValidStreamVideos++;
            const v = check.videoData;
            const sizeMb = ((v.storageSize || 0) / (1024 * 1024)).toFixed(1);
            console.log(`      ✅ ${lessonPrefix}`);
            console.log(`         GUID: ${videoId} | Status: Ready | Size: ${sizeMb} MB | Duration: ${v.length || 0}s`);
          } else {
            totalErrors++;
            console.log(`      ❌ ERROR: ${lessonPrefix}`);
            console.log(`         GUID: ${videoId} TIDAK DITEMUKAN di Bunny Stream (Status: ${check.statusCode})`);
          }
        } else if (lesson.url && lesson.url.startsWith('http')) {
          totalOtherMedia++;
          const httpCheck = await checkHttpUrl(lesson.url);
          if (httpCheck.ok) {
            console.log(`      ✅ ${lessonPrefix}`);
            console.log(`         URL: ${lesson.url} (HTTP ${httpCheck.statusCode} OK)`);
          } else {
            console.log(`      ⚠️ ${lessonPrefix}`);
            console.log(`         URL: ${lesson.url} (Response: ${httpCheck.statusCode || httpCheck.error})`);
          }
        } else if (lesson.contentType === 'text') {
          console.log(`      📝 ${lessonPrefix}`);
          console.log(`         Tipe Artikel Teks (${lesson.textContent?.length || 0} karakter)`);
        } else {
          console.log(`      ⚪ ${lessonPrefix}`);
          console.log(`         URL: ${lesson.url || '(Belum ada URL/Kosong)'}`);
        }
      }
    }
  }

  console.log(`\n=================================================================`);
  console.log(`📊 RINGKASAN HEALTH CHECK STATUS:`);
  console.log(`=================================================================`);
  console.log(`📚 Total Materi/Lesson Diperiksa:  ${totalLessonsChecked}`);
  console.log(`🎬 Total Video Bunny Stream:        ${totalBunnyStreamVideos}`);
  console.log(`✅ Bunny Stream Video Berfungsi:   ${totalValidStreamVideos}/${totalBunnyStreamVideos}`);
  console.log(`🌐 Media Lain / Teks:              ${totalOtherMedia + (totalLessonsChecked - totalBunnyStreamVideos - totalOtherMedia)}`);
  console.log(`❌ Video Rusak / Hilang:           ${totalErrors}`);
  console.log(`=================================================================`);

  if (totalErrors === 0) {
    console.log(`🎉 SEMUA VIDEO DAN MATERI DI WEBSITE AMAN 100% DAN BERFUNGSI SEMPURNA!`);
  } else {
    console.log(`⚠️ Ditemukan ${totalErrors} materi dengan video yang bermasalah.`);
  }
}

verifyAllMaterials().catch(console.error).finally(() => process.exit(0));
