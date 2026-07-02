const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config({ path: '.env' });

// 1. Validate and Sanitize Environment Variables
const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME; // e.g., "alfajr-storage"
const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY; // Storage Zone Password/Access Key

// Sanitize region: if multiple regions are space-separated, take the first one
const bunnyStorageRegionRaw = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com';
const bunnyStorageRegion = bunnyStorageRegionRaw.split(/\s+/)[0];

// Sanitize CDN hostname: strip https:// and trailing slashes
const bunnyCdnHostnameRaw = process.env.BUNNY_CDN_HOSTNAME;
const bunnyCdnHostname = bunnyCdnHostnameRaw ? bunnyCdnHostnameRaw.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

if (!bunnyStorageZoneName || !bunnyStorageAccessKey || !bunnyCdnHostname) {
  console.error('❌ Missing Bunny.net configuration in .env. Please ensure the following are defined:');
  console.error('   - BUNNY_STORAGE_ZONE_NAME');
  console.error('   - BUNNY_STORAGE_ACCESS_KEY');
  console.error('   - BUNNY_CDN_HOSTNAME');
  process.exit(1);
}

console.log('⚙️ Configuration Loaded:');
console.log(`   - Storage Zone Name: ${bunnyStorageZoneName}`);
console.log(`   - Storage Region:    ${bunnyStorageRegion}`);
console.log(`   - CDN Hostname:      ${bunnyCdnHostname}`);

const localBackupDir = path.join(__dirname, '../firebase_backup');

if (!fs.existsSync(localBackupDir)) {
  console.error(`❌ Local backup directory not found at: ${localBackupDir}`);
  console.error('Please make sure you have run the download backup script first.');
  process.exit(1);
}

/**
 * Recursively find all files in a directory
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  return arrayOfFiles;
}

/**
 * Determine MIME type based on file extension
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.apk': 'application/vnd.android.package-archive',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.zip': 'application/zip',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

function checkFileExistsOnBunny(remotePath) {
  return new Promise((resolve) => {
    const sanitizedPath = remotePath.replace(/^\//, '').replace(/\\/g, '/');
    const encodedPath = sanitizedPath.split('/').map(encodeURIComponent).join('/');
    const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${encodedPath}`;

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'DESCRIBE',
      headers: {
        'AccessKey': bunnyStorageAccessKey
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(body);
            resolve({ exists: true, size: parseInt(data.Length || '0', 10) });
          } catch (e) {
            resolve({ exists: false, size: 0 });
          }
        } else {
          resolve({ exists: false, size: 0 });
        }
      });
    });

    req.on('error', () => {
      resolve({ exists: false, size: 0 });
    });

    req.end();
  });
}

function uploadToBunny(filePath, remotePath, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const stats = fs.statSync(filePath);
    const totalSize = stats.size;
    const sanitizedPath = remotePath.replace(/^\//, '').replace(/\\/g, '/');
    const encodedPath = sanitizedPath.split('/').map(encodeURIComponent).join('/');
    const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${encodedPath}`;

    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname,
      method: 'PUT',
      headers: {
        'AccessKey': bunnyStorageAccessKey,
        'Content-Type': contentType || 'application/octet-stream',
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

    const isSmallFile = totalSize < 10 * 1024 * 1024; // < 10MB
    if (isSmallFile) {
      try {
        const fileBuffer = fs.readFileSync(filePath);
        if (onProgress) onProgress(100, totalSize, totalSize);
        req.write(fileBuffer);
        req.end();
      } catch (err) {
        reject(err);
      }
    } else {
      const readStream = fs.createReadStream(filePath, { highWaterMark: 4 * 1024 * 1024 }); // 4MB chunks
      let bytesWritten = 0;
      let lastLoggedPercent = -1;

      readStream.on('data', (chunk) => {
        const canWrite = req.write(chunk);
        bytesWritten += chunk.length;

        if (totalSize > 0) {
          const percent = Math.floor((bytesWritten / totalSize) * 100);
          if (percent !== lastLoggedPercent) {
            lastLoggedPercent = percent;
            if (onProgress) {
              onProgress(percent, bytesWritten, totalSize);
            }
          }
        }

        if (!canWrite) {
          readStream.pause();
        }
      });

      req.on('drain', () => {
        readStream.resume();
      });

      readStream.on('end', () => {
        req.end();
      });

      readStream.on('error', (err) => {
        req.destroy();
        reject(err);
      });
    }
  });
}

/**
 * Main Run Function
 */
async function main() {
  try {
    console.log('\n🏁 Starting Backup Upload to Bunny.net...');
    
    // Get all local files
    const localFiles = getAllFiles(localBackupDir);
    console.log(`📂 Found ${localFiles.length} files in local backup folder: "${localBackupDir}"`);

    let uploadedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    // Pengecekan berbasis Nama Saja (Name-Only Check):
    // - true: Skip file jika nama file sudah ada di Bunny.net (Lebih Cepat).
    // - false: Skip file jika nama file ada DAN ukuran filenya sama persis (Lebih Aman).
    const CHECK_BY_NAME_ONLY = true;

    for (let i = 0; i < localFiles.length; i++) {
      const localFilePath = localFiles[i];
      // Get path relative to the backup directory (e.g. "attachments/file.pdf" or "videos_compressed/file.mp4")
      const relativePath = path.relative(localBackupDir, localFilePath).replace(/\\/g, '/');

      // Skip original uncompressed videos locally since we only want to upload the compressed versions
      if (relativePath.startsWith('videos/')) {
        continue;
      }

      // Map the local videos_compressed folder to the remote videos folder on Bunny.net
      let remotePath = relativePath;
      if (relativePath.startsWith('videos_compressed/')) {
        remotePath = relativePath.replace('videos_compressed/', 'videos/');
      }

      const stats = fs.statSync(localFilePath);
      const localSize = stats.size;
      const contentType = getMimeType(localFilePath);

      console.log(`\n[${i + 1}/${localFiles.length}] Checking file: ${remotePath} (${(localSize / (1024 * 1024)).toFixed(2)} MB)`);

      try {
        // 1. Check if file already exists on Bunny at the remote path
        const check = await checkFileExistsOnBunny(remotePath);
        
        // Pengecekan hybrid:
        // - Untuk video (.mp4): HARUS cek ukuran (CHECK_BY_NAME_ONLY diabaikan) agar mendeteksi & menimpa video besar lama.
        // - Untuk file lainnya: Menyesuaikan dengan setting CHECK_BY_NAME_ONLY.
        const isVideo = remotePath.endsWith('.mp4');
        const isAlreadyUploaded = (CHECK_BY_NAME_ONLY && !isVideo) 
          ? check.exists 
          : (check.exists && check.size === localSize);

        if (isAlreadyUploaded) {
          console.log(`⏭️ Skipping (Already exists on Bunny.net with matching size)`);
          skippedCount++;
          continue;
        }

        if (check.exists) {
          console.log(`⚠️ Size mismatch on Bunny.net (Local: ${localSize} bytes, Bunny: ${check.size} bytes). Overwriting...`);
        } else {
          console.log(`📤 Uploading to Bunny.net...`);
        }

        // 2. Upload to Bunny.net with automatic retries for transient errors (e.g. 502 Bad Gateway)
        const maxRetries = 3;
        let attempt = 0;
        let success = false;

        while (attempt < maxRetries && !success) {
          try {
            attempt++;
            if (attempt > 1) {
              console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for "${remotePath}" after failure...`);
              // Wait 10 seconds before retrying (backoff)
              await new Promise(resolve => setTimeout(resolve, 10000));
            }
            
            let lastLogged = -1;
            await uploadToBunny(localFilePath, remotePath, contentType, (percent) => {
              // Log every 10% or at 100% to keep logs clean
              if (percent % 10 === 0 && percent !== lastLogged) {
                lastLogged = percent;
                console.log(`   [PROGRESS] ${percent}% uploaded...`);
              }
            });
            success = true;
          } catch (uploadErr) {
            console.error(`⚠️ Upload attempt ${attempt} failed: ${uploadErr.message}`);
            if (attempt >= maxRetries) {
              throw uploadErr; // Re-throw if all retries fail
            }
          }
        }

        console.log(`✅ Upload successful: https://${bunnyCdnHostname}/${remotePath}`);
        uploadedCount++;
        
      } catch (err) {
        console.error(`❌ Failed to upload "${remotePath}" after 3 attempts:`, err.message);
        failedCount++;
      }
    }

    console.log(`\n🎉 Upload Process Completed!`);
    console.log(`📊 Total files processed: ${localFiles.length}`);
    console.log(`✅ Successfully uploaded: ${uploadedCount}`);
    console.log(`⏭️ Skipped (already uploaded): ${skippedCount}`);
    console.log(`❌ Failed uploads: ${failedCount}`);

  } catch (error) {
    console.error('❌ Upload process failed with critical error:', error);
  }
}

main();
