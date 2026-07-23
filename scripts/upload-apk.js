const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env' });

// Validate Bunny.net Configuration
const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
const bunnyStorageRegionRaw = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com';
const bunnyStorageRegion = bunnyStorageRegionRaw.split(/\s+/)[0];
const bunnyCdnHostnameRaw = process.env.BUNNY_CDN_HOSTNAME;
const bunnyCdnHostname = bunnyCdnHostnameRaw ? bunnyCdnHostnameRaw.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

if (!bunnyStorageZoneName || !bunnyStorageAccessKey || !bunnyCdnHostname) {
  console.error('❌ Missing Bunny.net configuration in .env');
  process.exit(1);
}

const filePath = path.join(__dirname, '../public/internasionalkomputer-elearning.apk');
const destination = 'internasionalkomputer-elearning-v2.apk';

if (!fs.existsSync(filePath)) {
  console.error(`❌ Local APK file not found at: ${filePath}`);
  process.exit(1);
}

function deleteOldApkFromBunny() {
  return new Promise((resolve) => {
    const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${destination}`;
    console.log(`🗑️ Deleting old APK from Bunny.net if exists: "${destination}"...`);

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'DELETE',
      headers: {
        'AccessKey': bunnyStorageAccessKey
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          console.log(`✅ Old APK deleted or not found (Status: ${res.statusCode}).`);
        } else {
          console.log(`⚠️ Delete response status ${res.statusCode}: ${body}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.warn(`⚠️ Warning: could not delete old file: ${err.message}`);
      resolve(); // proceed anyway
    });

    req.end();
  });
}

function uploadApkToBunny() {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const totalSize = stats.size;
    const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${destination}`;

    console.log(`📤 Uploading new Release APK to Bunny.net: "${destination}" (${(totalSize / (1024 * 1024)).toFixed(2)} MB)...`);

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'PUT',
      headers: {
        'AccessKey': bunnyStorageAccessKey,
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': totalSize
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          resolve(body);
        } else {
          reject(new Error(`Bunny.net upload failed with status ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    // Stream the file to the request
    const readStream = fs.createReadStream(filePath);
    
    let uploadedBytes = 0;
    let lastLoggedPercent = -1;

    readStream.on('data', (chunk) => {
      uploadedBytes += chunk.length;
      const percent = Math.round((uploadedBytes / totalSize) * 100);
      if (percent % 20 === 0 && percent !== lastLoggedPercent) {
        lastLoggedPercent = percent;
        console.log(`   [PROGRESS] ${percent}% uploaded...`);
      }
    });

    readStream.pipe(req);

    readStream.on('error', (err) => {
      req.destroy();
      reject(err);
    });
  });
}

async function main() {
  try {
    await deleteOldApkFromBunny();
    await uploadApkToBunny();
    console.log('\n=========================================');
    console.log('✅ UPLOAD RELEASE APK SUKSES!');
    console.log('🔗 Link Download Bunny CDN:');
    console.log(`   https://${bunnyCdnHostname}/${destination}`);
    console.log('=========================================');
  } catch (error) {
    console.error('❌ Gagal mengunggah APK:', error.message);
  }
}

main();
