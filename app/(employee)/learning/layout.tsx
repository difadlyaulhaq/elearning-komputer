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

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
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
      <div className="flex h-screen bg-brand-gray">
        <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className="flex-1 w-full flex flex-col">
          <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
          <main className="flex-1 overflow-y-auto">
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
