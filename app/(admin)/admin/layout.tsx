// app/(admin)/admin/layout.tsx
'use client';

import { AuthProvider } from '@/context/AuthContext';
import React, { useState } from 'react';
import AdminSidebar from '@/components/admin/Sidebar';
import MobileHeader from '@/components/admin/MobileHeader'; // Import MobileHeader
import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';



export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <AuthProvider>
        <Toaster position="top-center" reverseOrder={false} />
        <div className="flex min-h-screen bg-brand-gray">
          <AdminSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          <div className="flex-1 w-full flex flex-col">
            <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />
            {/* Main Content - adjusted for mobile header */}
            <main className="flex-1 w-full">
              {children}
            </main>
          </div>
        </div>
    </AuthProvider>
  );
}
