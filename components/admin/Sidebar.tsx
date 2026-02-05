// components/admin/Sidebar.tsx
'use client';

import React, { useState } from 'react';
import { Home, Users, FolderTree, BookOpen, BarChart3, LogOut, ChevronDown, ChevronRight, Loader, MonitorPlay, Sparkles, Shield } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

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
  badge?: string;
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

  const toggleSubmenu = (key: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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
      onClose(); // Close mobile menu after navigation
    }
  };

  const menuItems: MenuItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      path: '/admin/dashboard'
    },
    {
      key: 'users',
      label: 'Manajemen Pengguna',
      icon: Users,
      path: '/admin/users'
    },
    {
      key: 'master',
      label: 'Master Data',
      icon: FolderTree,
      hasSubmenu: true,
      subItems: [
        { key: 'categories', label: 'Kategori', path: '/admin/categories' },
        { key: 'divisions', label: 'Divisi', path: '/admin/divisions' }
      ]
    },
    {
      key: 'courses',
      label: 'Kelola Kursus',
      icon: BookOpen,
      path: '/admin/courses'
    },
    {
      key: 'reports',
      label: 'Laporan',
      icon: BarChart3,
      path: '/admin/reports'
    },
    {
      key: 'security-log',
      label: 'Log Keamanan',
      icon: Shield,
      path: '/admin/security-log'
    },
    {
      key: 'learning-panel',
      label: 'Lihat sebagai Pegawai',
      icon: MonitorPlay,
      path: '/learning/dashboard'
    }
  ];

  const SidebarContent = () => (
    <>
      {/* Logo Section */}
      <div className="p-4 md:p-6 border-b border-gray-800/50 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#C5A059]/10 to-transparent"></div>
        <div className="relative flex items-center space-x-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[#C5A059] to-[#8B7355] rounded-xl blur-md opacity-50"></div>
            <div className="relative w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#C5A059] to-[#8B7355] rounded-xl flex items-center justify-center overflow-hidden shadow-xl border border-[#C5A059]/30">
              <img
                src="/logo-alfajr.png"
                alt="Logo Alfajr"
                className="w-full h-full object-contain p-1.5" 
              />
            </div>
          </div>
          <div>
            <h1 className="text-base md:text-lg font-bold bg-gradient-to-r from-[#C5A059] via-[#D4AF37] to-[#C5A059] bg-clip-text text-transparent">
              Alfajr Umroh
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Sparkles className="text-[#C5A059]" size={12} />
              <p className="text-[10px] md:text-xs text-gray-400 font-semibold">Admin Panel</p>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-2 md:py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {menuItems.map((item) => (
          <div key={item.key}>
            <button
              onClick={() => {
                if (item.hasSubmenu) {
                  toggleSubmenu(item.key);
                } else {
                  handleNavigation(item.path);
                }
              }}
              className={`w-full flex items-center justify-between px-4 md:px-6 py-2.5 md:py-3 text-left transition-all group relative ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-[#C5A059] to-amber-600 text-black'
                  : 'text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className={`p-1 md:p-1.5 rounded-lg transition-all ${
                  isActive(item.path) 
                    ? 'bg-black/10' 
                    : 'bg-gray-800/50 group-hover:bg-[#C5A059]/20'
                }`}>
                  <item.icon 
                    size={18} 
                    className={isActive(item.path) ? 'text-black' : 'text-[#C5A059]'} 
                  />
                </div>
                <span className={`font-medium text-xs md:text-sm ${isActive(item.path) ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {item.badge && (
                  <span className={`text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-bold ${
                    isActive(item.path)
                      ? 'bg-black/20 text-black'
                      : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
                {item.hasSubmenu && (
                  <div className={`transition-transform ${expandedMenus[item.key] ? 'rotate-0' : ''}`}>
                    {expandedMenus[item.key] ? (
                      <ChevronDown size={14} className={isActive(item.path) ? 'text-black' : 'text-gray-400'} />
                    ) : (
                      <ChevronRight size={14} className={isActive(item.path) ? 'text-black' : 'text-gray-400'} />
                    )}
                  </div>
                )}
              </div>
            </button>

            {/* Submenu */}
            {item.hasSubmenu && expandedMenus[item.key] && (
              <div className="bg-gradient-to-r from-gray-800/30 to-transparent border-l-2 border-[#C5A059]/30 ml-4 md:ml-6 my-1 animate-fadeIn">
                {item.subItems?.map((subItem) => (
                  <button
                    key={subItem.key}
                    onClick={() => handleNavigation(subItem.path)}
                    className={`w-full flex items-center px-3 md:px-4 py-2 md:py-2.5 text-left text-xs md:text-sm transition-all relative group ${
                      isActive(subItem.path)
                        ? 'text-[#C5A059] font-semibold bg-[#C5A059]/10'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
                    }`}
                  >
                    {isActive(subItem.path) && (
                      <div className="absolute left-0 w-1 h-4 bg-[#C5A059] rounded-r-full"></div>
                    )}
                    <span className="ml-2">{subItem.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Logout Button (Mobile/Scrollable) */}
        <div className="mt-5 px-1 md:px-0">
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="relative w-full flex items-center justify-center space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-2.5 bg-red-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-red-600 text-xs md:text-sm shadow-lg shadow-red-900/20"
            >
              {isLoggingOut ? (
                <Loader className="animate-spin" size={18} />
              ) : (
                <LogOut size={18} />
              )}
              <span className="font-semibold">
                {isLoggingOut ? 'Keluar...' : 'Logout'}
              </span>
            </button>
        </div>
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Mobile Drawer / Desktop Fixed */}
      <div className={`
        fixed top-0 left-0 h-screen bg-gradient-to-b from-black via-gray-900 to-black text-white flex flex-col shadow-2xl z-50 transition-transform duration-300 ease-in-out pt-[env(safe-area-inset-top)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:w-64 w-64
      `}>
        <SidebarContent />
      </div>

      {/* Spacer for desktop layout */}
      <div className="hidden md:block w-64" />
    </>
  );
};

export default AdminSidebar;
