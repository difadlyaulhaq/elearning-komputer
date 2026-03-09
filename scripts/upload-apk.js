const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: '.env' });

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
});

const bucket = admin.storage().bucket();
const filePath = path.join(__dirname, '../public/alfajr-elearning.apk');
const destination = 'alfajr-elearning.apk';

async function uploadFile() {
  try {
    console.log('Starting upload...');
    await bucket.upload(filePath, {
      destination: destination,
      metadata: {
        contentType: 'application/vnd.android.package-archive',
        cacheControl: 'public, max-age=31536000',
      },
    });
    console.log('Upload successful!');

    // Make the file publicly accessible and get the URL
    const file = bucket.file(destination);
    await file.makePublic();
    
    // Construct the public URL manually for Firebase Storage to match the format we need
    const url = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/${encodeURIComponent(destination)}?alt=media`;
    
    console.log('\n--- PUBLIC URL ---');
    console.log(url);
    console.log('------------------\n');
    
  } catch (error) {
    console.error('Error uploading file:', error);
  }
}

uploadFile();
