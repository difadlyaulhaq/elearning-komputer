const https = require('https');
require('dotenv').config({ path: '.env' });

const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
const bunnyStorageRegionRaw = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com';
const bunnyStorageRegion = bunnyStorageRegionRaw.split(/\s+/)[0];

const remotePath = 'alfajr-elearning.apk';
const url = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${remotePath}`;

console.log(`Checking URL with DESCRIBE: ${url}`);

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
  console.log(`Status Code: ${res.statusCode}`);
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Headers:', res.headers);
    console.log('Body:', body);
  });
});

req.on('error', (err) => {
  console.error('Error:', err);
});

req.end();
