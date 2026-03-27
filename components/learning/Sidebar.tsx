'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Compass, BookCopy, Award, LogOut,
  ChevronLeft, Loader2, X, PanelLeftClose, PanelLeftOpen, Shield
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { name: 'Beranda', icon: LayoutDashboard, href: '/learning/dashboard' },
    { name: 'Katalog Materi', icon: Compass, href: '/learning/catalog' },
    { name: 'Kursus Saya', icon: BookCopy, href: '/learning/my-courses' },
    { name: 'Riwayat', icon: Award, href: '/learning/history' },
  ];

  const handleLogout = async () => {
    await logout();
  };

  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-64';

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
        {!isCollapsed && (
          <Link href="/learning/dashboard" onClick={onClose} className="flex items-center gap-3 min-w-0 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
              <Image src="/logo-alfajr.png" alt="Logo" width={32} height={32} className="object-contain p-0.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight group-hover:text-[#C5A059] transition-colors">
                Alfajr E-Learning
              </p>
              <p className="text-[11px] text-[#C5A059] font-medium">Learning Portal</p>
            </div>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/learning/dashboard" onClick={onClose} className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 mx-auto block">
            <Image src="/logo-alfajr.png" alt="Logo" width={36} height={36} className="object-contain p-0.5" />
          </Link>
        )}

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed
            ? <PanelLeftOpen size={16} />
            : <PanelLeftClose size={16} />}
        </button>

        {/* Mobile close */}
        <button
          onClick={onClose}
          className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* User card */}
      {user && !isCollapsed && (
        <div className="px-3 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center font-semibold text-white text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate leading-tight transition-colors">{user.name}</p>
              <p className="text-[11px] text-[#C5A059] truncate">{user.division || 'Employee'}</p>
            </div>
          </div>
        </div>
      )}
      {user && isCollapsed && (
        <div className="px-2 py-3 border-b border-white/10 shrink-0 flex justify-center">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center font-semibold text-white text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {menuItems.map((item) => {
          const isCurrentPath = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              title={isCollapsed ? item.name : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative
                ${isCurrentPath
                  ? 'bg-[#C5A059] text-black shadow-sm'
                  : 'text-gray-300 hover:bg-white/8 hover:text-white'}
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <item.icon
                size={18}
                className={`shrink-0 ${isCurrentPath ? 'text-black' : 'text-[#C5A059]'}`}
              />
              {!isCollapsed && (
                <span className={`text-sm font-medium truncate ${isCurrentPath ? 'font-semibold' : ''}`}>
                  {item.name}
                </span>
              )}
              {/* Collapsed tooltip */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}

        {/* Admin link (only for admins) */}
        {user?.role === 'admin' && (
          <div className="pt-3 mt-2 border-t border-white/10">
            <Link
              href="/admin/dashboard"
              onClick={onClose}
              title={isCollapsed ? 'Kembali ke Admin' : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-400
                hover:bg-white/8 hover:text-[#C5A059] transition-all group relative
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <Shield size={18} className="shrink-0 text-[#C5A059]" />
              {!isCollapsed && (
                <>
                  <span className="text-sm font-medium flex-1">Kembali ke Admin</span>
                  <ChevronLeft size={14} className="opacity-50" />
                </>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
                  Panel Admin
                </div>
              )}
            </Link>
          </div>
        )}
      </nav>

      {/* Footer — Logout */}
      <div className="shrink-0 px-2 py-3 border-t border-white/10 mt-auto md:mt-0">
        <button
          onClick={handleLogout}
          disabled={isLoading}
          title={isCollapsed ? 'Keluar' : undefined}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400
            hover:bg-red-500/15 hover:text-red-300 transition-all disabled:opacity-50 group relative
            ${isCollapsed ? 'justify-center' : ''}
          `}
        >
          {isLoading
            ? <Loader2 size={18} className="shrink-0 animate-spin" />
            : <LogOut size={18} className="shrink-0" />}
          {!isCollapsed && (
            <span className="text-sm font-medium">{isLoading ? 'Keluar...' : 'Keluar'}</span>
          )}
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
              Keluar
            </div>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-50 flex flex-col
          bg-gradient-to-b from-[#0d0d0d] via-[#111111] to-[#0d0d0d]
          border-r border-white/8 shadow-2xl
          transition-all duration-300 ease-in-out
          pt-[env(safe-area-inset-top)]
          ${sidebarWidth}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <SidebarContent />
      </aside>

      {/* Desktop spacer */}
      <div className={`hidden md:block shrink-0 transition-all duration-300 ${sidebarWidth}`} />
    </>
  );
};

export default Sidebar;
