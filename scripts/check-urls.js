const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

// 1. Validate Environment Variables
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing Firebase configuration variables in .env');
  process.exit(1);
}

// 2. Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  })
});

const db = admin.firestore();

async function checkUrls() {
  try {
    console.log('🔍 Menghubungkan ke Firestore untuk memeriksa URL...');
    const coursesSnapshot = await db.collection('courses').get();
    
    let firebaseCount = 0;
    let bunnyCount = 0;
    let otherCount = 0;
    
    const firebaseUrls = [];

    coursesSnapshot.forEach(doc => {
      const course = doc.data();
      
      const checkField = (val, fieldLabel) => {
        if (!val || typeof val !== 'string') return;
        if (val.includes('firebasestorage.googleapis.com')) {
          firebaseCount++;
          firebaseUrls.push(`   - [${course.title}] -> ${fieldLabel}:\n     ${val}`);
        } else if (val.includes('b-cdn.net') || val.includes('bunnycdn.com')) {
          bunnyCount++;
        } else {
          otherCount++;
        }
      };

      // 1. Check Course fields
      checkField(course.coverImage, 'Cover Image');
      checkField(course.thumbnail, 'Course Thumbnail');

      // 2. Check Lessons fields
      if (Array.isArray(course.sections)) {
        course.sections.forEach(section => {
          if (Array.isArray(section.lessons)) {
            section.lessons.forEach(lesson => {
              const fields = ['url', 'attachmentUrl', 'thumbnail', 'videoUrl', 'thumbnailUrl'];
              fields.forEach(field => {
                checkField(lesson[field], `Lesson "${lesson.title}" (${field})`);
              });
            });
          }
        });
      }
    });

    console.log(`\n=========================================`);
    console.log(`📊 LAPORAN PEMERIKSAAN URL LIVE FIRESTORE:`);
    console.log(`=========================================`);
    console.log(`✅ URL Bunny.net/CDN aktif:       ${bunnyCount}`);
    console.log(`❌ URL Firebase Storage tersisa:  ${firebaseCount}`);
    console.log(`⚪ URL lainnya (YouTube/Drive/dll): ${otherCount}`);
    console.log(`=========================================`);

    if (firebaseCount > 0) {
      console.log(`\n⚠️ Detail URL Firebase Storage yang masih aktif di database:`);
      firebaseUrls.forEach(url => console.log(url));
      console.log(`\n💡 Tindakan: Jalankan migrasi live menggunakan skrip 'migrate-firestore-urls.js' untuk mengubahnya.`);
    } else {
      console.log(`\n🎉 BERHASIL! Semua file media di database sudah bermigrasi penuh ke Bunny.net.`);
      console.log(`   Sudah aman untuk menghapus data di Firebase Storage.`);
    }

  } catch (error) {
    console.error('❌ Error checking URLs:', error);
  } finally {
    process.exit(0);
  }
}

checkUrls();
