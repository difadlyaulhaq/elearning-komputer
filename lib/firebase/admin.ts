// lib/firebase/admin.ts
import * as admin from 'firebase-admin';

let adminAuth: admin.auth.Auth;
let adminDb: admin.firestore.Firestore;
let adminStorage: admin.storage.Storage;

try {
  if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error('Firebase Admin Env Variables are missing. Check .env.local');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
    });
    
    console.log('[FIREBASE ADMIN] Initialized successfully');
  }

  adminAuth = admin.auth();
  adminDb = admin.firestore();
  adminStorage = admin.storage();

} catch (error) {
  console.error('[FIREBASE ADMIN ERROR] Initialization failed:', error);
  // Biarkan undefined agar API route yang memakainya bisa handle errornya
}

export { adminAuth, adminDb, adminStorage };