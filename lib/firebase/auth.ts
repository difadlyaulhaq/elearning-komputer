// lib/firebase/auth.ts
import { auth } from './config';
import { signOut } from 'firebase/auth';

/**
 * Note: Token verification should always be done on the server-side 
 * using the Firebase Admin SDK (e.g., via /api/auth/session).
 * Client-side verification is insecure.
 */

export const logoutUser = async (): Promise<boolean> => {
  try {
    // Sign out dari Firebase
    await signOut(auth);
    
    // Clear cookies via API
    const response = await fetch('/api/auth/logout', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Logout error:', error);
    return false;
  }
};