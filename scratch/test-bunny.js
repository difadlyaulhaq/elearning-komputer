const fs = require('fs');
require('dotenv').config({ path: '.env' });

async function testBunny() {
  const bunnyStorageZoneName = process.env.BUNNY_STORAGE_ZONE_NAME;
  const bunnyStorageAccessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
  const bunnyStorageRegionRaw = process.env.BUNNY_STORAGE_REGION || 'storage.bunnycdn.com';
  const bunnyStorageRegion = bunnyStorageRegionRaw.split(/\s+/)[0];
  const bunnyCdnHostnameRaw = process.env.BUNNY_CDN_HOSTNAME;
  const bunnyCdnHostname = bunnyCdnHostnameRaw ? bunnyCdnHostnameRaw.replace(/^https?:\/\//i, '').replace(/\/$/, '') : '';

  console.log('Testing Bunny.net Storage with config:');
  console.log(`- Zone Name: ${bunnyStorageZoneName}`);
  console.log(`- Region: ${bunnyStorageRegion}`);
  console.log(`- CDN Hostname: ${bunnyCdnHostname}`);
  
  if (!bunnyStorageZoneName || !bunnyStorageAccessKey || !bunnyCdnHostname) {
    console.error('❌ Missing config in .env');
    return;
  }

  const dummyContent = 'Hello from Antigravity test script at ' + new Date().toISOString();
  const remotePath = 'test_files/test_connection.txt';
  const bunnyUrl = `https://${bunnyStorageRegion}/${bunnyStorageZoneName}/${remotePath}`;

  try {
    console.log(`📤 Sending PUT request to: ${bunnyUrl}`);
    const response = await fetch(bunnyUrl, {
      method: 'PUT',
      headers: {
        'AccessKey': bunnyStorageAccessKey,
        'Content-Type': 'text/plain',
      },
      body: dummyContent,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ Bunny.net returned error status ${response.status} (${response.statusText}):`);
      console.error(errText);
    } else {
      console.log('✅ Connection successful!');
      console.log(`🔗 CDN URL: https://${bunnyCdnHostname}/${remotePath}`);
    }
  } catch (error) {
    console.error('❌ Network or Fetch Error:', error);
  }
}

testBunny();
