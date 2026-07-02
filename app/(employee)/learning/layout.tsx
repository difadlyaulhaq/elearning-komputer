'use client';

import React, { useState } from 'react';
import Sidebar from '@/components/learning/Sidebar';
import MobileHeader from '@/components/learning/MobileHeader';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import dynamic from 'next/dynamic';

const ScreenProtection = dynamic(
  () => import('@/components/shared/ScreenProtection').then(mod => mod.ScreenProtection),
  { ssr: false }
);

import { usePathname } from 'next/navigation';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileLandscape, setIsMobileLandscape] = useState(false);
  const pathname = usePathname();
  
  const isViewFilePage = pathname?.endsWith('/learning/view-file') || pathname?.endsWith('/view-file');

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

  if (isViewFilePage) {
    return (
      <ScreenProtection
        userEmail={user?.email}
        enableWatermark={true}
        enableBlurOnFocusLoss={true}
        enableKeyboardBlock={true}
        enableContextMenuBlock={true}
        enableDevToolsDetection={true}
        showWarningOnAttempt={true}
      >
        <main className="h-screen w-screen overflow-hidden bg-slate-950">
          <Toaster position="top-right" />
          {children}
        </main>
      </ScreenProtection>
    );
  }
  
  return (
    <ScreenProtection
      userEmail={user?.email}
      enableWatermark={true}
      enableBlurOnFocusLoss={true}
      enableKeyboardBlock={true}
      enableContextMenuBlock={true}
      enableDevToolsDetection={true}
      showWarningOnAttempt={true}
    >
      <div className="flex h-screen bg-brand-gray overflow-hidden">
        {!isMobileLandscape && (
          <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        )}
        <div className="flex-1 w-full flex flex-col min-w-0">
          {!isMobileLandscape && (
            <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
          )}
          <main className={`flex-1 overflow-y-auto ${isMobileLandscape ? 'p-0' : ''}`}>
            <Toaster position="top-right" />
            {children}
          </main>
        </div>
      </div>
    </ScreenProtection>
  );
}

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  );
}
