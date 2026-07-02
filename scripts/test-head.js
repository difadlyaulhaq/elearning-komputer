const https = require('https');
require('dotenv').config({ path: '.env' });

const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
const bunnyStorageRegionRaw = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com';
const bunnyStorageRegion = bunnyStorageRegionRaw.split(/\s+/)[0];

// Check the first file (alfajr-elearning.apk)
const remotePath = 'alfajr-elearning.apk';
const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${remotePath}`;

console.log(`Checking URL: ${url}`);

const parsedUrl = new URL(url);
const options = {
  hostname: parsedUrl.hostname,
  path: parsedUrl.pathname,
  method: 'HEAD',
  headers: {
    'AccessKey': bunnyStorageAccessKey
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', res.headers);
});

req.on('error', (err) => {
  console.error('Error:', err);
});

req.end();
