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
      
      {/* Header Mobile - Enhanced */}
      <div className="sticky top-0 z-50 bg-[#000000] text-white md:hidden shadow-lg">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/learning/dashboard" className="p-1 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft size={22} />
            </Link>
            <div>
              <h1 className="font-bold text-lg leading-tight">Riwayat Belajar</h1>
              <p className="text-xs text-[#C5A059] font-medium">{stats.total} Kursus Terdaftar</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-[#C5A059] text-black' : 'hover:bg-white/10'}`}
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
                className="w-full pl-10 pr-10 py-3 bg-white/10 border-0 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-[#C5A059] outline-none transition-all"
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

      {/* Hero Header - Desktop */}
      <div className="relative bg-[#000000] overflow-hidden mb-8 shadow-md hidden md:block">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, #C5A059 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
        <div className="relative container mx-auto p-4 md:px-6 md:py-12">
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C5A059] to-[#8B6E3C] flex items-center justify-center shadow-lg text-white">
                  <History size={32} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Riwayat Belajar</h1>
                  <p className="text-[#C5A059] mt-1 font-medium">Arsip perjalanan pengembangan diri Anda</p>
                </div>
              </div>

              <div className="flex gap-4 text-white self-stretch">
                <div className="text-center px-6 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm flex-1">
                  <div className="text-2xl font-bold text-[#C5A059]">{stats.total}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70">Total</div>
                </div>
                <div className="text-center px-6 py-2 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm flex-1">
                  <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
                  <div className="text-[10px] uppercase tracking-wider opacity-70">Selesai</div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="container mx-auto p-4 md:px-6">
        
        {/* Stats & Filters Combined for Mobile */}
        <div className="md:hidden space-y-6 mb-6">
          {/* Horizontal Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            <button 
              onClick={() => setFilter('all')}
              className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                filter === 'all' ? 'bg-[#C5A059] text-black shadow-md' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button 
              onClick={() => setFilter('in-progress')}
              className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                filter === 'in-progress' ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Berjalan ({stats.inProgress})
            </button>
            <button 
              onClick={() => setFilter('completed')}
              className={`flex-shrink-0 px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                filter === 'completed' ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              Selesai ({stats.completed})
            </button>
          </div>
        </div>

        {/* Controls Bar Desktop */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-8 hidden md:flex flex-row justify-between items-center gap-4 sticky top-4 z-10">
          <div className="flex p-1.5 bg-gray-50 rounded-lg gap-1">
            {['all', 'in-progress', 'completed'].map((f) => (
              <button 
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-6 py-2.5 rounded-md text-sm font-bold transition-all ${
                  filter === f 
                    ? 'bg-[#C5A059] text-black shadow-sm' 
                    : 'text-gray-500 hover:bg-white hover:text-black'
                }`}
              >
                {f === 'all' ? 'Semua' : f === 'in-progress' ? 'Sedang Berjalan' : 'Selesai'}
              </button>
            ))}
          </div>

          <div className="relative w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kursus..."
              className="w-full pl-10 pr-4 py-2.5 border text-gray-700 border-gray-200 rounded-lg focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-[#C5A059] mb-4" />
            <p className="text-gray-500 font-medium">Memuat riwayat belajar...</p>
          </div>
        ) : filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredCourses.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                <div className="relative h-44 bg-gray-900">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
                      <BookOpen size={48} className="text-[#C5A059]/30" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'completed' ? 'bg-green-500 text-white' : 'bg-[#C5A059] text-black'
                    }`}>
                      {item.status === 'completed' ? 'Selesai' : 'Berjalan'}
                    </span>
                  </div>
                  {item.status !== 'completed' && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 h-1.5">
                      <div className="bg-[#C5A059] h-full transition-all duration-1000" style={{ width: `${item.progress || 0}%` }} />
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 line-clamp-2 text-sm leading-tight mb-3 h-10">
                    {item.title}
                  </h3>
                  
                  <div className="flex items-center text-[11px] text-gray-500 font-medium mb-4 gap-3">
                    <span className="flex items-center gap-1"><Clock size={12} /> {item.totalVideos || 0} Video</span>
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">{item.categoryName || 'Materi'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'completed' ? (
                        <CheckCircle size={18} className="text-green-500" />
                      ) : (
                        <div className="text-xs font-bold text-[#C5A059]">{item.progress || 0}%</div>
                      )}
                    </div>
                    
                    <Link 
                      href={`/learning/course/${item.courseId}`}
                      className="text-xs font-bold bg-[#000000] text-white px-4 py-2 rounded-xl hover:bg-[#C5A059] hover:text-black transition-all"
                    >
                      {item.status === 'completed' ? 'Lihat Detail' : 'Lanjutkan'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-6 bg-white rounded-3xl border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              {searchQuery ? <Search size={32} className="text-gray-300" /> : <BookOpen size={32} className="text-gray-300" />}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {searchQuery ? 'Hasil tidak ditemukan' : 'Belum ada riwayat'}
            </h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto mb-8">
              {searchQuery 
                ? `Tidak dapat menemukan "${searchQuery}". Coba kata kunci lain.`
                : 'Anda belum memulai kursus apapun. Mari mulai belajar sekarang!'}
            </p>
            {searchQuery ? (
              <button onClick={() => setSearchQuery('')} className="text-[#C5A059] font-bold text-sm underline">Hapus Pencarian</button>
            ) : (
              <Link href="/learning/catalog" className="inline-block bg-black text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-black/20">Jelajahi Katalog</Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningHistoryPage;