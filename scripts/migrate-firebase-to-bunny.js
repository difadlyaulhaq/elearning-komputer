const admin = require('firebase-admin');
const path = require('path');
const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: '.env' });
// 1. Validate Environment Variables
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

// Bunny.net configuration (Should be added to .env or .env.local)
const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME; // e.g., "alfajr-storage"
const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY; // Storage Zone Password/Access Key
const bunnyStorageRegion = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com'; // Default region
const bunnyCdnHostname = process.env.BUNNY_CDN_HOSTNAME; // e.g., "alfajr.b-cdn.net"

if (!projectId || !clientEmail || !privateKey || !bucketName) {
  console.error('❌ Missing Firebase configuration variables in .env');
  process.exit(1);
}

if (!bunnyStorageZoneName || !bunnyStorageAccessKey || !bunnyCdnHostname) {
  console.error('❌ Missing Bunny.net configuration in .env. Please ensure the following are defined:');
  console.error('   - BUNNY_STORAGE_ZONE_NAME');
  console.error('   - BUNNY_STORAGE_ACCESS_KEY');
  console.error('   - BUNNY_CDN_HOSTNAME');
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
const db = admin.firestore();

/**
 * Upload buffer to Bunny.net Storage using HTTP PUT
 */
function uploadToBunny(fileBuffer, remotePath, contentType) {
  return new Promise((resolve, reject) => {
    // Bunny.net API expects path prefixed with Storage Zone Name
    // Sanitize path (remove leading slash if present, replace backslashes)
    const sanitizedPath = remotePath.replace(/^\//, '').replace(/\\/g, '/');
    const encodedPath = sanitizedPath.split('/').map(encodeURIComponent).join('/');
    const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${encodedPath}`;

    console.log(`📤 Uploading to Bunny.net: ${url} (${contentType})`);

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'PUT',
      headers: {
        'AccessKey': bunnyStorageAccessKey,
        'Content-Type': contentType || 'application/octet-stream',
        'Content-Length': fileBuffer.length
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

    req.write(fileBuffer);
    req.end();
  });
}

/**
 * Main Migration Flow
 */
async function runMigration() {
  try {
    console.log('🏁 Starting migration from Firebase Storage to Bunny.net...');

    // Phase 1: File Migration
    console.log('\n--- PHASE 1: COPYING FILES ---');
    const [files] = await bucket.getFiles();
    console.log(`📂 Found ${files.length} files in Firebase Storage bucket: "${bucketName}"`);

    const urlMap = {}; // Maps Firebase URLs to Bunny.net CDN URLs
    const localBackupDir = path.join(__dirname, '../firebase_backup');

    if (!fs.existsSync(localBackupDir)) {
      fs.mkdirSync(localBackupDir, { recursive: true });
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`\n[${i + 1}/${files.length}] Processing file: ${file.name}`);

      try {
        // Construct local path and make sure nested directory structure exists
        const localFilePath = path.join(localBackupDir, file.name);
        const localFileDir = path.dirname(localFilePath);
        if (!fs.existsSync(localFileDir)) {
          fs.mkdirSync(localFileDir, { recursive: true });
        }

        // Get Metadata to check size
        const [metadata] = await file.getMetadata();
        const firebaseSize = parseInt(metadata.size, 10);

        // Check if file already exists locally and has the correct size
        if (fs.existsSync(localFilePath)) {
          const localStats = fs.statSync(localFilePath);
          if (localStats.size === firebaseSize) {
            console.log(`⏭️ Skipping ${file.name} (already downloaded with correct size: ${localStats.size} bytes)`);
            continue;
          }
          console.log(`⚠️ Size mismatch for ${file.name} (Local: ${localStats.size} bytes, Firebase: ${firebaseSize} bytes). Redownloading...`);
        }

        // Download from Firebase directly to local disk
        console.log(`📥 Downloading ${file.name} to local backup: ${localFilePath}...`);
        await file.download({ destination: localFilePath });
        console.log(`💾 Saved locally: ${file.name}`);
        
        // --- TEMPORARILY COMMENTED OUT UPLOAD TO BUNNY.NET ---
        /*
        // Get Content-Type from Firebase metadata
        const [metadata] = await file.getMetadata();
        const contentType = metadata.contentType || 'application/octet-stream';

        // Read file back from local disk for uploading
        const fileBuffer = fs.readFileSync(localFilePath);

        // Upload to Bunny
        await uploadToBunny(fileBuffer, file.name, contentType);
        console.log(`✅ Successfully uploaded ${file.name} to Bunny.net`);

        // Generate the new Bunny CDN URL
        const bunnyCdnUrl = `https://${bunnyCdnHostname}/${file.name.replace(/\\/g, '/')}`;
        
        // Construct standard Firebase URL to map
        // (both absolute URLs and gs:// formats or direct access urls)
        const firebaseLegacyUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(file.name)}?alt=media`;
        urlMap[file.name] = {
          legacyUrl: firebaseLegacyUrl,
          newUrl: bunnyCdnUrl,
        };

        console.log(`🔗 Mapped:`);
        console.log(`   Old: ${firebaseLegacyUrl}`);
        console.log(`   New: ${bunnyCdnUrl}`);
        */

      } catch (err) {
        console.error(`❌ Failed to migrate file "${file.name}":`, err.message);
      }
    }

    let updatedDocsCount = 0;

    // --- TEMPORARILY DISABLED PHASE 2 (FIRESTORE UPDATE) ---
    console.log('\n⚠️ PHASE 2 (FIRESTORE UPDATE) IS CURRENTLY DISABLED AS REQUESTED.');
    /*
    // Phase 2: Database URL Migration
    console.log('\n--- PHASE 2: UPDATING FIRESTORE REFERENCES ---');
    console.log('Searching "courses" collection for Firebase Storage URL references...');
    
    const coursesSnapshot = await db.collection('courses').get();
    console.log(`📚 Found ${coursesSnapshot.size} courses to inspect.`);

    let updatedDocsCount = 0;

    for (const doc of coursesSnapshot.docs) {
      const courseData = doc.data();
      let isUpdated = false;

      // 1. Update Course Cover Image
      if (courseData.coverImage && typeof courseData.coverImage === 'string') {
        if (courseData.coverImage.includes('firebasestorage.googleapis.com')) {
          // Extract filename from URL
          const match = courseData.coverImage.match(/\/o\/([^?]+)/);
          if (match) {
            const fileName = decodeURIComponent(match[1]);
            const bunnyCdnUrl = `https://${bunnyCdnHostname}/${fileName}`;
            console.log(`🔄 Updating Course [${courseData.title}] coverImage:`);
            console.log(`   Old: ${courseData.coverImage}`);
            console.log(`   New: ${bunnyCdnUrl}`);
            courseData.coverImage = bunnyCdnUrl;
            isUpdated = true;
          }
        }
      }

      // 1b. Update Course Thumbnail
      if (courseData.thumbnail && typeof courseData.thumbnail === 'string') {
        if (courseData.thumbnail.includes('firebasestorage.googleapis.com')) {
          const match = courseData.thumbnail.match(/\/o\/([^?]+)/);
          if (match) {
            const fileName = decodeURIComponent(match[1]);
            const bunnyCdnUrl = `https://${bunnyCdnHostname}/${fileName}`;
            console.log(`🔄 Updating Course [${courseData.title}] thumbnail:`);
            console.log(`   Old: ${courseData.thumbnail}`);
            console.log(`   New: ${bunnyCdnUrl}`);
            courseData.thumbnail = bunnyCdnUrl;
            isUpdated = true;
          }
        }
      }

      // 2. Update Lessons / Video URLs / Attachments in Sections
      if (Array.isArray(courseData.sections)) {
        courseData.sections.forEach((section) => {
          if (Array.isArray(section.lessons)) {
            section.lessons.forEach((lesson) => {
              // Update all potential storage fields inside a lesson
              const fieldsToUpdate = ['url', 'attachmentUrl', 'thumbnail', 'videoUrl', 'thumbnailUrl'];
              
              fieldsToUpdate.forEach((field) => {
                if (lesson[field] && typeof lesson[field] === 'string' && lesson[field].includes('firebasestorage.googleapis.com')) {
                  const match = lesson[field].match(/\/o\/([^?]+)/);
                  if (match) {
                    const fileName = decodeURIComponent(match[1]);
                    const bunnyCdnUrl = `https://${bunnyCdnHostname}/${fileName}`;
                    console.log(`  🔄 Updating Lesson [${lesson.title}] ${field}:`);
                    console.log(`     Old: ${lesson[field]}`);
                    console.log(`     New: ${bunnyCdnUrl}`);
                    lesson[field] = bunnyCdnUrl;
                    isUpdated = true;
                  }
                }
              });
            });
          }
        });
      }

      if (isUpdated) {
        await db.collection('courses').doc(doc.id).update(courseData);
        console.log(`✅ Saved updates for Course ID: ${doc.id} (${courseData.title})`);
        updatedDocsCount++;
      }
    }
    */

    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Total files processed: ${files.length}`);
    console.log(`📊 Firestore documents updated: ${updatedDocsCount}`);

  } catch (error) {
    console.error('❌ Migration failed with critical error:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
