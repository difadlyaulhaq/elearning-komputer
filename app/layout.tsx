import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import 'highlight.js/styles/github-dark.css';
import PWAEnforcer from "@/components/shared/PWAEnforcer";
import { AuthProvider } from "@/context/AuthContext";
import { ScreenProtection } from "@/components/shared/ScreenProtection";

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
                const isSmallScreen = window.innerWidth < 768; // Adjust threshold as needed
                const hasTouchScreen = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
                const ua = navigator.userAgent.toLowerCase();
                const isMobileUa = /mobile|android|iphone|ipad|phone/i.test(ua);

                let score = 0;
                if (isSmallScreen) score++;
                if (hasTouchScreen) score++;
                if (isMobileUa) score++;

                return score >= 2;
              }

              if (isMobileDevice()) {
                document.body.innerHTML = '<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:100vh;text-align:center;padding:20px;background-color:#f8f8f8;color:#333;"><h1 style="font-size:2.5em;color:#d9534f;">Akses Ditolak</h1><p style="font-size:1.2em;max-width:600px;">Mohon maaf, website ini hanya dapat diakses dari perangkat desktop. Silakan gunakan komputer atau laptop Anda untuk melanjutkan.</p><p style="font-size:1em;color:#666;">Terima kasih atas pengertiannya.</p></div>';
                // Optionally, you could redirect:
                // window.location.href = '/blocked';
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
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