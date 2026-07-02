const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

// 1. Validate Environment Variables
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.error('❌ Missing Firebase configuration variables in .env');
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

const bucket = admin.storage().bucket();

async function checkAndDownload() {
  try {
    const missingFiles = [
      'videos/1782967124196-opt-Cetak ID Card.mp4',
      'videos/1782975170947-opt-Cetak ID Tas.mp4'
    ];

    console.log('🔗 Menghubungkan ke Firebase Storage bucket...');
    console.log(`🪣 Bucket: ${bucketName}\n`);

    for (const filePath of missingFiles) {
      const file = bucket.file(filePath);
      console.log(`🔍 Memeriksa file "${filePath}" di Firebase Storage...`);
      
      const [exists] = await file.exists();
      if (exists) {
        console.log(`   ✅ DITEMUKAN!`);
        const localDest = path.join(__dirname, '../firebase_backup', filePath);
        
        // Buat folder parent jika belum ada
        fs.mkdirSync(path.dirname(localDest), { recursive: true });
        
        console.log(`   📥 Mengunduh file ke: ${localDest}...`);
        
        const startTime = Date.now();
        await file.download({ destination: localDest });
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        
        const stats = fs.statSync(localDest);
        console.log(`   ✅ Sukses diunduh dalam ${duration} detik! (Ukuran: ${(stats.size / (1024 * 1024)).toFixed(2)} MB)\n`);
      } else {
        console.log(`   ❌ TIDAK DITEMUKAN di Firebase Storage.\n`);
      }
    }
  } catch (error) {
    console.error('❌ Terjadi kesalahan saat memeriksa/mengunduh:', error);
  } finally {
    process.exit(0);
  }
}

checkAndDownload();
