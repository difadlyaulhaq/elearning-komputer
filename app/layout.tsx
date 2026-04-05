import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import 'highlight.js/styles/github-dark.css';
import PWAEnforcer from "@/components/shared/PWAEnforcer";
import { AuthProvider } from "@/context/AuthContext";
import { ScreenProtection } from "@/components/shared/ScreenProtection";
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
  title: " Alfajr E-learning",
  description: "Platform E-learning Alfajr Umroh",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Alfajr Learning",
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function isMobileDevice() {
                const ua = navigator.userAgent;
                const platform = navigator.platform || '';
                const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                
                // 1. Standard UA Check
                const isMobileUA = /mobile|android|iphone|ipad|phone/i.test(ua);
                
                // 2. Aggressive Desktop Mode Check
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

              // Pre-check
              checkApp();
              
              // Extreme Polling (Android WebViews can delay injection up to 2 seconds)
              let attempts = 0;
              const interval = setInterval(() => {
                attempts++;
                if (checkApp() || attempts > 30) { // 3 seconds max
                  clearInterval(interval);
                }
              }, 100);

              const device = isMobileDevice();
              const isNativeApp = window.__isNativeApp || localStorage.getItem('alfajr_is_native') === 'true';
              const isAllowedPath = window.location.pathname === '/download-app' || window.location.pathname === '/blocked';

              if (device.isMobile && !isNativeApp && !isAllowedPath) {
                // ... rest of logic
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WebProtection />
        <AuthProvider>
          <ScreenProtection>
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </ScreenProtection>
        </AuthProvider>
      </body>
    </html>
  );
}