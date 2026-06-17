// app/(admin)/admin/layout.tsx
'use client';

import { AuthProvider } from '@/context/AuthContext';
import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/Sidebar';
import MobileHeader from '@/components/admin/MobileHeader'; // Import MobileHeader
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';

const ScreenProtection = dynamic(
  () => import('@/components/shared/ScreenProtection').then(mod => mod.ScreenProtection),
  { ssr: false }
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);

  React.useEffect(() => {
    const checkOrientation = () => {
      // Check if it's mobile and in landscape
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isLandscape = window.innerWidth > window.innerHeight && window.innerHeight < 600;
      setIsMobileLandscape(isMobile && isLandscape);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  return (
    <AuthProvider>
      <ScreenProtection
        enableWatermark={true}
        enableBlurOnFocusLoss={true}
        enableKeyboardBlock={true}
        enableContextMenuBlock={true}
        enableDevToolsDetection={true}
        showWarningOnAttempt={true}
      >
        <Toaster position="top-center" reverseOrder={false} />
        <div className="flex min-h-screen bg-brand-gray overflow-hidden">
          {!isMobileLandscape && (
            <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          )}
          <div className="flex-1 w-full flex flex-col min-w-0">
            {!isMobileLandscape && (
              <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
            )}
            {/* Main Content - adjusted for mobile landscape */}
            <main className={`flex-1 w-full ${isMobileLandscape ? 'p-0' : ''}`}>
              {children}
            </main>
          </div>
        </div>
      </ScreenProtection>
    </AuthProvider>
  );
}
