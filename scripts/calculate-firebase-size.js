const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

// Load credentials
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.error('❌ Missing Firebase configuration variables in .env');
  process.exit(1);
}

// Initialize Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  storageBucket: bucketName
});

const bucket = admin.storage().bucket();

function formatSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function calculateStorageSize() {
  try {
    console.log(`🔍 Fetching files from Firebase Storage bucket: "${bucketName}"...\n`);
    const [files] = await bucket.getFiles();
    
    let totalBytes = 0;
    let fileCount = 0;

    console.log('--------------------------------------------------');
    console.log('No. | File Path | Size');
    console.log('--------------------------------------------------');

    files.forEach((file, index) => {
      const size = parseInt(file.metadata.size || 0);
      totalBytes += size;
      fileCount++;
      console.log(`${index + 1} | ${file.name} | ${formatSize(size)}`);
    });

    console.log('--------------------------------------------------');
    console.log(`\n📊 SUMMARY:`);
    console.log(`   - Total Files: ${fileCount}`);
    console.log(`   - Total Storage Size: ${formatSize(totalBytes)} (${totalBytes} bytes)`);
    
    // Estimate Bunny.net Storage cost (Falkenstein/Europe is $0.01 per GB/month)
    const totalGB = totalBytes / (1024 * 1024 * 1024);
    const bunnyStorageCostPerMonth = totalGB * 0.01;
    console.log(`\n💰 Bunny.net Estimates (Standard Edge Storage):`);
    console.log(`   - Storage Cost: ~$${bunnyStorageCostPerMonth.toFixed(4)} / month (at $0.01 per GB)`);
    console.log(`   - Bandwidth / Traffic Cost: ~$${(totalGB * 0.005).toFixed(4)} per GB downloaded (EU/US CDN standard pricing is $0.005/GB)`);
    
  } catch (error) {
    console.error('❌ Failed to calculate storage size:', error);
  } finally {
    process.exit(0);
  }
}

calculateStorageSize();
