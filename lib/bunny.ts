import { createHash } from 'crypto';

const securityKey = process.env.BUNNY_SECURITY_KEY!;
const cdnHostname = process.env.BUNNY_CDN_HOSTNAME!;
const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID!;

/**
 * Generates a signed URL for a Bunny.net video using URL Token Authentication.
 * @param videoId The ID of the video in your Bunny.net Stream library.
 * @param expirationTime The duration in minutes for which the token is valid. Defaults to 180 minutes (3 hours).
 * @returns The full, signed HLS playlist URL (playlist.m3u8).
 */
export function generateSignedVideoUrl(videoId: string, expirationTime: number = 180): string {
  if (!securityKey || !cdnHostname || !libraryId) {
    throw new Error('Bunny.net environment variables are not configured.');
  }

  // Path to the video file in the URL structure.
  const urlPath = `/` + videoId + `/playlist.m3u8`;
  
  // Expiration timestamp (Unix epoch time)
  const expires = Math.floor(Date.now() / 1000) + (expirationTime * 60);

  // The string to be hashed
  const stringToHash = securityKey + urlPath + expires;

  // Create the hash
  const hash = createHash('sha256').update(stringToHash).digest('base64');
  
  // The token uses URL-safe Base64 encoding
  const token = hash.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const signedUrl = `https://${cdnHostname}${urlPath}?token=${token}&expires=${expires}`;

  return signedUrl;
}
