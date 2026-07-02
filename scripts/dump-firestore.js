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

async function dumpFirestore() {
  try {
    console.log('🔍 Connecting to Firestore...');
    
    // Ambil daftar seluruh root collection secara dinamis
    const collections = await db.listCollections();
    console.log(`📚 Found ${collections.length} root collections.\n`);

    const dumpData = {};

    for (const collection of collections) {
      console.log(`📁 Processing Collection: "${collection.id}"...`);
      const snapshot = await collection.get();
      console.log(`   Found ${snapshot.size} documents.`);

      dumpData[collection.id] = {};
      
      snapshot.forEach(doc => {
        dumpData[collection.id][doc.id] = doc.data();
      });
    }

    const outputPath = path.join(__dirname, '../firestore_dump.json');
    fs.writeFileSync(outputPath, JSON.stringify(dumpData, null, 2), 'utf8');
    
    console.log(`\n=========================================`);
    console.log(`✅ DUMP SUKSES!`);
    console.log(`💾 Seluruh data Firestore berhasil disimpan ke file:`);
    console.log(`   ${outputPath}`);
    console.log(`💡 Buka file tersebut di VS Code untuk mencari data.`);
    console.log(`=========================================`);

  } catch (error) {
    console.error('❌ Error reading Firestore data:', error);
  } finally {
    process.exit(0);
  }
}

dumpFirestore();
