import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import Script from "next/script";
import "./globals.css";
import 'highlight.js/styles/github-dark.css';
import { AuthProvider } from "@/context/AuthContext";
import { WebProtection } from "@/components/shared/WebProtection";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: " E-learning Portal",
  description: "Platform E-learning E-learning Portal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "E-learning Portal",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="dns-prefetch" href="https://firebasestorage.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />
        <link rel="preconnect" href="https://www.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <Script
          id="bootstrap-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // ============================================
              // 1. DOMAIN MIGRATION REDIRECT (Anti-Redownload)
              // ============================================
              const currentHost = window.location.hostname;
              const targetHost = 'elearningalfajrumroh.com';
              if (currentHost.includes('vercel.app')) {
                window.location.replace('https://' + targetHost + window.location.pathname + window.location.search);
              }

              (function() {
                try {
                  var ua = navigator.userAgent;
                  var isNative = (window.Capacitor && window.Capacitor.isNativePlatform()) ||
                                 ua.indexOf('AlfajrApp') > -1 ||
                                 ua.indexOf('capacitor') > -1 ||
                                 ua.indexOf('wv') > -1 ||
                                 localStorage.getItem('alfajr_is_native') === 'true';
                  window.__ALFAJR_NATIVE_APP = !!isNative;
                  if (isNative) window.__isNativeApp = true;
                } catch(e) {
                  window.__ALFAJR_NATIVE_APP = false;
                }
              })();

              function isMobileDevice() {
                const ua = navigator.userAgent;
                const platform = navigator.platform || '';
                const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                const isMobileUA = /mobile|android|iphone|ipad|phone/i.test(ua);
                const isLinuxWithTouch = hasTouch && /Linux/i.test(platform);
                const isMacWithTouch = hasTouch && /MacIntel/i.test(platform) && navigator.maxTouchPoints > 1;
                const hasOrientation = typeof window.orientation !== 'undefined';
                return {
                  isMobile: isMobileUA || isLinuxWithTouch || isMacWithTouch || (hasTouch && hasOrientation),
                  isLinuxWithTouch: isLinuxWithTouch
                };
              }

              function checkApp() {
                const uaLower = navigator.userAgent.toLowerCase();
                const isNativeApp = uaLower.includes('alfajrapp') || 
                                   uaLower.includes('capacitor') || 
                                   !!window.Capacitor || 
                                   !!(window.WebKit && window.WebKit.messageHandlers && window.WebKit.messageHandlers.cordova) ||
                                   localStorage.getItem('alfajr_is_native') === 'true';
                if (isNativeApp) {
                  window.__isNativeApp = true;
                  try { localStorage.setItem('alfajr_is_native', 'true'); } catch(e) {}
                  window.dispatchEvent(new Event('alfajr_native_detected'));
                  return true;
                }
                return false;
              }

              checkApp();
              let attempts = 0;
              const interval = setInterval(() => {
                attempts++;
                if (checkApp() || attempts > 30) clearInterval(interval);
              }, 100);

              const device = isMobileDevice();
              const isNativeApp = window.__isNativeApp || localStorage.getItem('alfajr_is_native') === 'true';
              const isAllowedPath = window.location.pathname === '/download-app' || window.location.pathname === '/blocked';

              if (device.isMobile && !isNativeApp && !isAllowedPath) {
                if (/android/i.test(navigator.userAgent) || device.isLinuxWithTouch) {
                  window.location.replace('/download-app');
                } else {
                  window.location.replace('/blocked');
                }
              }
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WebProtection />
        <AuthProvider>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}