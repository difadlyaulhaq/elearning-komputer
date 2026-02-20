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
    ],
  },
  async headers() {
    return [
      {
        source: '/Alfajr-elearning.apk',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/vnd.android.package-archive',
          },
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="Alfajr-elearning.apk"',
          },
        ],
      },
    ];
  },
  /* config options here */
};

export default withPWA(nextConfig);
