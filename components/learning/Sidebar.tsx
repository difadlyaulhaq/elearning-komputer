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
              <Image src="/LOGO INTER.png" alt="Logo" width={32} height={32} className="object-contain p-0.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight group-hover:text-[#0284c7] transition-colors">
                E-learning Portal
              </p>
              <p className="text-[11px] text-[#0284c7] font-medium">Learning Portal</p>
            </div>
          </Link>
        )}
        {isCollapsed && (
          <Link href="/learning/dashboard" onClick={onClose} className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 mx-auto block">
            <Image src="/LOGO INTER.png" alt="Logo" width={36} height={36} className="object-contain p-0.5" />
          </Link>
        )}

        {/* Desktop collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shrink-0"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed
            ? <PanelLeftOpen size={16} />
            : <PanelLeftClose size={16} />}
        </button>

        {/* Mobile close */}
        <button
          onClick={onClose}
          className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* User card */}
      {user && !isCollapsed && (
        <div className="px-3 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-slate-50 transition-colors">
            <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center font-bold text-sky-600 text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate leading-tight transition-colors">{user.name}</p>
              <p className="text-[11px] text-sky-600 font-medium truncate">{user.division || 'Pegawai'}</p>
            </div>
          </div>
        </div>
      )}
      {user && isCollapsed && (
        <div className="px-2 py-3 border-b border-slate-100 shrink-0 flex justify-center">
          <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center font-bold text-sky-600 text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Navigation & Footer Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <nav className="py-3 px-2 space-y-0.5">
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
                    ? 'bg-sky-50 text-sky-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <item.icon
                  size={18}
                  className={`shrink-0 ${isCurrentPath ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'}`}
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
            <div className="pt-3 mt-2 border-t border-slate-100">
              <Link
                href="/admin/dashboard"
                onClick={onClose}
                title={isCollapsed ? 'Kembali ke Admin' : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600
                  hover:bg-slate-50 hover:text-slate-900 transition-all group relative
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <Shield size={18} className="shrink-0 text-slate-400 group-hover:text-slate-600" />
                {!isCollapsed && (
                  <>
                    <span className="text-sm font-medium flex-1">Kembali ke Admin</span>
                    <ChevronLeft size={14} className="opacity-50 text-slate-400" />
                  </>
                )}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-100">
                    Panel Admin
                  </div>
                )}
              </Link>
            </div>
          )}
        </nav>

        {/* Footer — Logout */}
        <div className="px-2 py-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            disabled={isLoading}
            title={isCollapsed ? 'Keluar' : undefined}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500
              hover:bg-red-55 hover:text-red-600 transition-all disabled:opacity-50 group relative
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            {isLoading
              ? <Loader2 size={18} className="shrink-0 animate-spin text-red-500" />
              : <LogOut size={18} className="shrink-0 text-red-500" />}
            {!isCollapsed && (
              <span className="text-sm font-medium">{isLoading ? 'Keluar...' : 'Keluar'}</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-slate-100">
                Keluar
              </div>
            )}
          </button>
        </div>
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
          bg-white border-r border-slate-200 shadow-sm
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
