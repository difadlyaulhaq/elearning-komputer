'use client';

import React, { useState } from 'react';
import {
  Home, Users, FolderTree, BookOpen, BarChart3, LogOut,
  ChevronDown, ChevronRight, Loader, MonitorPlay, Shield,
  X, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<any>;
  path?: string;
  hasSubmenu?: boolean;
  subItems?: SubMenuItem[];
}

interface SubMenuItem {
  key: string;
  label: string;
  path: string;
}

const AdminSidebar = ({ isOpen, onClose }: AdminSidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { logout, isLoading: isLoggingOut } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSubmenu = (key: string) => {
    setExpandedMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return pathname === path || pathname.startsWith(`${path}/`);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigation = (path?: string) => {
    if (path) {
      router.push(path);
      onClose();
    }
  };

  const menuItems: MenuItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: Home, path: '/admin/dashboard' },
    { key: 'users', label: 'Manajemen Pengguna', icon: Users, path: '/admin/users' },
    {
      key: 'master', label: 'Master Data', icon: FolderTree, hasSubmenu: true,
      subItems: [
        { key: 'categories', label: 'Kategori', path: '/admin/categories' },
        { key: 'divisions', label: 'Divisi', path: '/admin/divisions' },
      ],
    },
    { key: 'courses', label: 'Kelola Kursus', icon: BookOpen, path: '/admin/courses' },
    { key: 'reports', label: 'Laporan', icon: BarChart3, path: '/admin/reports' },
    { key: 'security-log', label: 'Log Keamanan', icon: Shield, path: '/admin/security-log' },
    { key: 'learning-panel', label: 'Lihat sebagai Pegawai', icon: MonitorPlay, path: '/learning/dashboard' },
  ];

  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-64';

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="relative flex items-center justify-between px-4 py-4 border-b border-slate-100 shrink-0">
        {!isCollapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100">
              <img src="/LOGO INTER.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate leading-tight">Internasional Komputer</p>
              <p className="text-[11px] text-sky-600 font-semibold">Admin Panel</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-9 h-9 rounded-xl bg-slate-50 mx-auto flex items-center justify-center overflow-hidden border border-slate-100">
            <img src="/LOGO INTER.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
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

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation & Footer Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
        <nav className="py-3 px-2 space-y-0.5">
          {menuItems.map((item) => (
            <div key={item.key}>
              <button
                onClick={() => item.hasSubmenu ? toggleSubmenu(item.key) : handleNavigation(item.path)}
                title={isCollapsed ? item.label : undefined}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group relative
                  ${isActive(item.path)
                    ? 'bg-sky-50 text-sky-600 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                  ${isCollapsed ? 'justify-center' : ''}
                `}
              >
                <item.icon
                  size={18}
                  className={`shrink-0 ${isActive(item.path) ? 'text-sky-600' : 'text-slate-400 group-hover:text-slate-600'}`}
                />
                {!isCollapsed && (
                  <>
                    <span className={`flex-1 text-sm font-medium truncate ${isActive(item.path) ? 'font-semibold' : ''}`}>
                      {item.label}
                    </span>
                    {item.hasSubmenu && (
                      expandedMenus[item.key]
                        ? <ChevronDown size={14} className="shrink-0 opacity-60" />
                        : <ChevronRight size={14} className="shrink-0 opacity-60" />
                    )}
                  </>
                )}
                {/* Collapsed tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
                    {item.label}
                  </div>
                )}
              </button>

              {/* Submenu */}
              {!isCollapsed && item.hasSubmenu && expandedMenus[item.key] && (
                <div className="ml-3 pl-3 mt-0.5 space-y-0.5 border-l border-slate-100">
                  {item.subItems?.map(sub => (
                    <button
                      key={sub.key}
                      onClick={() => handleNavigation(sub.path)}
                      className={`
                        w-full flex items-center px-3 py-2 rounded-lg text-left text-sm transition-all
                        ${isActive(sub.path)
                          ? 'text-sky-600 font-semibold bg-sky-50/50'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}
                      `}
                    >
                      {isActive(sub.path) && <span className="w-1.5 h-1.5 rounded-full bg-sky-600 mr-2 shrink-0" />}
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer — Logout */}
        <div className={`px-2 py-3 border-t border-slate-100 ${isCollapsed ? '' : ''}`}>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isCollapsed ? 'Logout' : undefined}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400
              hover:bg-red-500/15 hover:text-red-300 transition-all disabled:opacity-50 group relative
              ${isCollapsed ? 'justify-center' : ''}
            `}
          >
            {isLoggingOut ? <Loader size={18} className="animate-spin shrink-0" /> : <LogOut size={18} className="shrink-0" />}
            {!isCollapsed && (
              <span className="text-sm font-medium">{isLoggingOut ? 'Keluar...' : 'Logout'}</span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 border border-white/10">
                Logout
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
          bg-white
          border-r border-slate-200 shadow-sm
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

export default AdminSidebar;
