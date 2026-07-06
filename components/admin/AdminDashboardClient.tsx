'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, BarChart3, TrendingUp, Shield, FolderKanban, Building2 } from 'lucide-react';

// Define icon mapping
const LucideIcons: { [key: string]: React.ElementType } = {
  Users: Users,
  BookOpen: BookOpen,
  BarChart3: BarChart3,
  TrendingUp: TrendingUp,
  Shield: Shield,
  FolderKanban: FolderKanban,
  Building2: Building2,
};

// --- Warning Popup Component ---
const SecurityWarningPopup = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm text-center p-8 animate-slideUp">
        <div className="mb-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="text-red-500" size={24} />
          </div>
          <h2 className="text-lg md:text-2xl font-bold text-black mb-2">
            Peringatan Keamanan
          </h2>
          <p className="text-gray-700 text-sm">
            Dokumen ini memiliki hak cipta dan dilindungi. Dilarang screenshot maupun rekam. Semua kegiatan di awasi, terdata dan ada riwayat.
          </p>
        </div>
        
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-3 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors shadow-lg touch-button"
        >
          Saya Mengerti
        </button>
      </div>
    </div>
  );
};

interface Stat {
  title: string;
  value: string;
  iconName: string;
  href: string;
  color: string;
  iconColor: string;
}

interface AdminDashboardClientProps {
  stats: Stat[];
  recentActivities: { id: string; user: string; action: string; time: string; }[];
}

export const AdminDashboardClient = ({ stats, recentActivities }: AdminDashboardClientProps) => {
  const [showWarning, setShowWarning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const shouldShowWarning = sessionStorage.getItem('showLoginWarning');
    if (shouldShowWarning === 'true') {
      setShowWarning(true);
    }
  }, []);

  const handleWarningDismiss = () => {
    setShowWarning(false);
    sessionStorage.removeItem('showLoginWarning');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <SecurityWarningPopup isOpen={showWarning} onClose={handleWarningDismiss} />

      {/* Header - Desktop Only */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 md:px-8 md:py-6 hidden md:block">
        <div>
          <h1 className="text-2xl font-bold text-black">Dashboard Admin</h1>
          <p className="text-gray-600 mt-1">Ringkasan aktivitas sistem pembelajaran</p>
        </div>
      </div>

      {/* Mobile Header with Greeting */}
      <div className="md:hidden bg-gradient-to-br from-white to-gray-50 px-4 pt-20 pb-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 font-medium">Dashboard Admin</p>
            <h1 className="text-2xl font-bold text-black mt-1">
              Selamat Datang 👋
            </h1>
          </div>
          <div className="w-12 h-12 bg-gradient-to-br from-[#0284c7] to-[#0369a1] rounded-full flex items-center justify-center shadow-lg">
            <TrendingUp className="text-white" size={24} />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Pantau dan kelola sistem pembelajaran
        </p>
      </div>

      {/* Stats Cards */}
      <div className="p-4 md:p-8">
        {/* Mobile: 2 columns, Desktop: 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          {stats.map((stat) => (
            <Link href={stat.href} key={stat.title}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden h-full hover:shadow-lg hover:border-gray-300 transition-all duration-300 hover:-translate-y-1">
                {/* Mobile Layout - Vertical Stack */}
                <div className="md:hidden p-4">
                  <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-3 shadow-sm`}>
                    {LucideIcons[stat.iconName] && React.createElement(LucideIcons[stat.iconName], { className: stat.iconColor, size: 20 })}
                  </div>
                  <p className="text-2xl font-bold text-black mb-1">
                    {stat.value}
                  </p>
                  <p className="text-xs font-semibold text-gray-600 leading-tight">
                    {stat.title}
                  </p>
                </div>

                {/* Desktop Layout - Original */}
                <div className="hidden md:block p-6">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${stat.color}`}>
                      {LucideIcons[stat.iconName] && React.createElement(LucideIcons[stat.iconName], { className: stat.iconColor, size: 24 })}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-black">{stat.value}</p>
                      <p className="text-sm text-gray-600 mt-1">{stat.title}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Activities & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Recent Activities */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-base md:text-lg font-bold text-black flex items-center">
                <div className="w-1 h-5 bg-[#0284c7] rounded-full mr-3"></div>
                Aktivitas Terbaru
              </h3>
            </div>
            <div className="p-4 md:p-6">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-start space-x-3 pb-4 last:pb-0 border-b border-gray-100 last:border-0"
                  >
                    <div className="w-2 h-2 bg-[#0284c7] rounded-full mt-2 shrink-0 shadow-sm"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black leading-relaxed">
                        <span className="font-semibold">{activity.user}</span>{' '}
                        <span className="text-gray-700">{activity.action}</span>
                      </p>
                      <div className="flex items-center mt-1.5">
                        <div className="w-1 h-1 bg-gray-400 rounded-full mr-2"></div>
                        <p className="text-xs text-gray-500 font-medium">{activity.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-4 md:px-6 md:py-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <h3 className="text-base md:text-lg font-bold text-black flex items-center">
                <div className="w-1 h-5 bg-[#0284c7] rounded-full mr-3"></div>
                Aksi Cepat
              </h3>
            </div>
            <div className="p-4 md:p-6">
              {/* Mobile: 3 Column Grid, Desktop: Vertical Stack */}
              <div className="grid grid-cols-3 gap-3 md:flex md:flex-col md:gap-3">
                <Link 
                  href="/admin/courses" 
                  className="group flex flex-col items-center md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3 p-3 md:p-4 border border-gray-200 rounded-xl hover:border-[#0284c7] hover:bg-[#f0f9ff] transition-all duration-200"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 group-hover:bg-white rounded-xl flex items-center justify-center transition-colors shadow-sm">
                    <BookOpen className="text-[#0284c7]" size={20} />
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <p className="font-bold text-xs md:text-sm text-black">Kelola Kursus</p>
                    <p className="hidden md:block text-xs text-gray-600 mt-0.5">Buat, edit, dan publikasi kursus</p>
                  </div>
                </Link>

                <Link 
                  href="/admin/users" 
                  className="group flex flex-col items-center md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3 p-3 md:p-4 border border-gray-200 rounded-xl hover:border-[#0284c7] hover:bg-[#f0f9ff] transition-all duration-200"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 group-hover:bg-white rounded-xl flex items-center justify-center transition-colors shadow-sm">
                    <Users className="text-[#0284c7]" size={20} />
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <p className="font-bold text-xs md:text-sm text-black">Kelola Pegawai</p>
                    <p className="hidden md:block text-xs text-gray-600 mt-0.5">Tambah dan nonaktifkan pegawai</p>
                  </div>
                </Link>

                <Link 
                  href="/admin/reports" 
                  className="group flex flex-col items-center md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-3 p-3 md:p-4 border border-gray-200 rounded-xl hover:border-[#0284c7] hover:bg-[#f0f9ff] transition-all duration-200"
                >
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 group-hover:bg-white rounded-xl flex items-center justify-center transition-colors shadow-sm">
                    <BarChart3 className="text-[#0284c7]" size={20} />
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <p className="font-bold text-xs md:text-sm text-black">Lihat Laporan</p>
                    <p className="hidden md:block text-xs text-gray-600 mt-0.5">Analisis progress pembelajaran</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
