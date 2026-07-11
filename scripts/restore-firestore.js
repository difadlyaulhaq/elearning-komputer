const admin = require('firebase-admin');



const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env' });

// 1. Validate Environment Variables
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!privateKey || !projectId || !clientEmail) {
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

async function restoreFirestore() {
  try {
    const backupPath = path.join(__dirname, '../firestore_backup.json');
    if (!fs.existsSync(backupPath)) {
      console.error(`❌ File backup tidak ditemukan di: ${backupPath}`);
      process.exit(1);
    }

    console.log('📖 Membaca berkas backup lokal...');
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

    console.log('🔄 Memulai proses restore data ke Firestore...');

    for (const [collectionId, docs] of Object.entries(backupData)) {
      // Kita batasi hanya restore data yang dimodifikasi oleh migrasi demi keamanan,
      // yaitu collection 'courses'. Jika Anda ingin merestore semua collection, uncomment baris di bawah.
      if (collectionId !== 'courses') {
        console.log(`⏭️ Melewati collection "${collectionId}" (Karena tidak diubah oleh migrasi)`);
        continue;
      }

      console.log(`📁 Merestore Collection: "${collectionId}"...`);
      
      const batch = db.batch();
      let count = 0;

      for (const [docId, docData] of Object.entries(docs)) {
        const docRef = db.collection(collectionId).doc(docId);
        // Tulis ulang data asli dari backup (menimpa data migrasi)
        batch.set(docRef, docData);
        count++;

        // Limit batch Firestore adalah 500 operasi penulisan
        if (count % 400 === 0) {
          await batch.commit();
          console.log(`   [RESTORE] Committed batch of 400 writes...`);
        }
      }

      if (count % 400 !== 0) {
        await batch.commit();
      }
      console.log(`   ✅ Selesai merestore ${count} dokumen pada "${collectionId}".`);
    }

    console.log('\n=========================================');
    console.log('🎉 RESTORE FIRESTORE SELESAI DENGAN SUKSES!');
    console.log('   Data "courses" telah dikembalikan ke kondisi asli.');
    console.log('=========================================');

  } catch (error) {
    console.error('❌ Terjadi kesalahan fatal saat melakukan restore:', error);
  } finally {
    process.exit(0);
  }
}

restoreFirestore();
