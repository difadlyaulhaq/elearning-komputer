// app/(employee)/learning/history/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { 
  BookOpen, 
  CheckCircle, 
  Loader2, 
  History, 
  Search, 
  Clock, 
  Filter,
  PlayCircle,
  X,
  ArrowLeft
} from 'lucide-react';
import { Course, Progress } from '@/types';

const LearningHistoryPage = () => {
  const { user, authFetch } = useAuth();
  const [history, setHistory] = useState<(Omit<Course, 'status'> & Progress)[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Filter dan Search
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await authFetch('/api/learning/history');
        const result = await response.json();
        if (result.success) {
          setHistory(result.data);
        } else {
          console.error('Failed to fetch history:', result.message);
        }
      } catch (error) {
        console.error('An error occurred while fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, authFetch]);

  // Logic Filtering
  const filteredCourses = useMemo(() => {
    return history.filter(item => {
      // Filter by Status Tab
      const statusMatch = 
        filter === 'all' ? true : 
        filter === 'completed' ? item.status === 'completed' :
        item.status !== 'completed';

      // Filter by Search Query
      const searchMatch = item.title.toLowerCase().includes(searchQuery.toLowerCase());

      return statusMatch && searchMatch;
    });
  }, [history, filter, searchQuery]);

  // Stats sederhana
  const stats = useMemo(() => {
    const completed = history.filter(h => h.status === 'completed').length;
    const inProgress = history.length - completed;
    return { completed, inProgress, total: history.length };
  }, [history]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-10">
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .line-clamp-2 { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
      `}} />
      
      {/* Header - Desktop, matching catalog style */}
      <div className="bg-white border-b border-gray-200 p-4 md:px-8 md:py-6 hidden md:block">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-black">Riwayat Belajar</h1>
            <p className="text-gray-600 mt-1">Arsip perjalanan pengembangan diri Anda</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center px-5 py-2 bg-[#F8F9FA] rounded-xl border border-gray-200">
              <div className="text-xl font-bold text-[#0284c7]">{stats.total}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Total</div>
            </div>
            <div className="text-center px-5 py-2 bg-[#F8F9FA] rounded-xl border border-gray-200">
              <div className="text-xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">Selesai</div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Mobile */}
      <div className="sticky top-0 z-50 bg-white text-black md:hidden shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/learning/dashboard" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={22} />
            </Link>
            <div>
              <h1 className="font-bold text-lg leading-tight">Riwayat Belajar</h1>
              <p className="text-xs text-[#0284c7] font-medium">{stats.total} Kursus Terdaftar</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-[#0284c7] text-white' : 'hover:bg-gray-100'}`}
          >
            {showSearch ? <X size={20} /> : <Search size={20} />}
          </button>
        </div>

        {/* Search Bar Mobile */}
        {showSearch && (
          <div className="px-4 pb-4 animate-in slide-in-from-top duration-200">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari materi atau kursus..."
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-black placeholder-gray-400 focus:ring-2 focus:ring-[#0284c7] outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <X size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-8">
        
        {/* Stats & Filters Combined for Mobile */}
        <div className="md:hidden space-y-6 mb-6">
          {/* Horizontal Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            <button 
              onClick={() => setFilter('all')}
              className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                filter === 'all' ? 'bg-[#0284c7] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button 
              onClick={() => setFilter('in-progress')}
              className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                filter === 'in-progress' ? 'bg-[#0284c7] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Berjalan ({stats.inProgress})
            </button>
            <button 
              onClick={() => setFilter('completed')}
              className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                filter === 'completed' ? 'bg-[#0284c7] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Selesai ({stats.completed})
            </button>
          </div>
        </div>

        {/* Controls Bar Desktop */}
        <div className="mb-8 hidden md:block">
          <div className="flex flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Semua' }, 
                { key: 'in-progress', label: 'Sedang Berjalan' }, 
                { key: 'completed', label: 'Selesai' }
              ].map((f) => (
                <button 
                  key={f.key}
                  onClick={() => setFilter(f.key as any)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                    filter === f.key 
                      ? 'bg-[#0284c7] text-white' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Cari kursus..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#0284c7] outline-none text-black"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-12 h-12 text-[#0284c7] animate-spin" />
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredCourses.map((item) => (
              <Link href={`/learning/course/${item.courseId}`} key={item.id}>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group h-full flex flex-col">
                  <div className="h-40 bg-gray-200 relative">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" crossOrigin="anonymous" onError={(e) => { e.currentTarget.src = "/logo-alfajr.png"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <img src="/logo-alfajr.png" alt="Logo Alfajr" className="w-1/2 opacity-30 grayscale" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-[#0284c7] shadow-sm">
                      {item.categoryName || 'Materi'}
                    </div>
                    {item.status === 'completed' && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle size={12} />
                        <span>Selesai</span>
                      </div>
                    )}
                    {item.status !== 'completed' && (
                      <div className="absolute top-2 left-2 bg-[#0284c7] text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Clock size={12} />
                        <span>Berjalan</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-bold text-base text-black mb-2 line-clamp-2">
                      {item.title}
                    </h3>
                    
                    {item.status !== 'completed' && (
                      <div className="mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-yellow-600">Dalam Pengerjaan</span>
                          <span className="text-xs font-bold text-black">{item.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div className="bg-[#0284c7] h-1.5 rounded-full" style={{ width: `${item.progress || 0}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center text-xs text-gray-500 gap-3 mb-3 flex-grow">
                      <span className="flex items-center gap-1"><PlayCircle size={12} /> {item.totalVideos || 0} Video</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        {item.status === 'completed' ? (
                          <CheckCircle size={16} className="text-green-500" />
                        ) : (
                          <div className="text-xs font-bold text-[#0284c7]">{item.progress || 0}%</div>
                        )}
                      </div>
                      
                      <span className="text-xs font-bold text-[#0284c7]">
                        {item.status === 'completed' ? 'Lihat Detail →' : 'Lanjutkan →'}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              {searchQuery ? <Search size={32} className="text-gray-300" /> : <BookOpen size={32} className="text-gray-300" />}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'Hasil tidak ditemukan' : 'Belum ada riwayat'}
            </h3>
            <p className="text-sm max-w-xs mx-auto mb-6">
              {searchQuery 
                ? `Tidak dapat menemukan "${searchQuery}". Coba kata kunci lain.`
                : 'Anda belum memulai kursus apapun. Mari mulai belajar sekarang!'}
            </p>
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="text-[#0284c7] font-bold text-sm underline">Hapus Pencarian</button>
            ) : (
              <Link href="/learning/catalog" className="inline-block bg-black text-white px-8 py-3 rounded-xl font-bold shadow-sm">Jelajahi Katalog</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningHistoryPage;