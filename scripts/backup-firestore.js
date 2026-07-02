const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
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

async function backupFirestore() {
  try {
    console.log('🔍 Menghubungkan ke Firestore untuk mengambil Backup...');
    
    // Ambil daftar seluruh root collection secara dinamis
    const collections = await db.listCollections();
    console.log(`📚 Menemukan ${collections.length} root collections.\n`);

    const backupData = {};

    for (const collection of collections) {
      console.log(`📁 Menyalin data dari collection: "${collection.id}"...`);
      const snapshot = await collection.get();
      console.log(`   Berhasil menyalin ${snapshot.size} dokumen.`);

      backupData[collection.id] = {};
      
      snapshot.forEach(doc => {
        backupData[collection.id][doc.id] = doc.data();
      });
    }

    const outputPath = path.join(__dirname, '../firestore_backup.json');
    fs.writeFileSync(outputPath, JSON.stringify(backupData, null, 2), 'utf8');
    
    console.log(`\n=========================================`);
    console.log(`✅ BACKUP FIRESTORE BERHASIL DISELAMATKAN!`);
    console.log(`💾 Data disimpan ke:`);
    console.log(`   ${outputPath}`);
    console.log(`💡 File ini akan digunakan oleh restore-firestore.js jika migrasi gagal.`);
    console.log(`=========================================`);

  } catch (error) {
    console.error('❌ Gagal melakukan backup Firestore:', error);
  } finally {
    process.exit(0);
  }
}

backupFirestore();
