import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  turbopack: {}, // Add empty turbopack config to silence the warning/error
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com', // Izinkan domain thumbnail YouTube
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'alfajr-cdn.b-cdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vz-1fd68911-c97.b-cdn.net',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.b-cdn.net',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // Limit file uploads to 1000mb to allow large uncompressed video uploads
    proxyClientMaxBodySize: '1000mb',
  },
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);