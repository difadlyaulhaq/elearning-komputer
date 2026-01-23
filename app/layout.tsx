import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import 'highlight.js/styles/github-dark.css';
import PWAEnforcer from "@/components/shared/PWAEnforcer";
import { AuthProvider } from "@/context/AuthContext";
import ScreenProtection from "@/components/shared/ScreenProtection";

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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <ScreenProtection>
            <Suspense fallback={null}>
              {/* <PWAEnforcer> */}
                {children}
              {/* </PWAEnforcer> */}
            </Suspense>
          </ScreenProtection>
        </AuthProvider>
      </body>
    </html>
  );
}