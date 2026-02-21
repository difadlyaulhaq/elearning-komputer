'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Filter, CheckCircle, Clock, XCircle, Eye, Loader2, ChevronDown, X, ChevronLeft, ChevronRight } from 'lucide-react';

type StatusType = 'completed' | 'in-progress' | 'not-started';

// --- Data Models ---
interface User {
  id: string;
  name: string;
  division: string;
  email: string;
}

interface ProgressItem {
  id: string;
  userId: string;
  courseId: string;
  courseName: string;
  progress: number;
  status: StatusType;
  lastAccess: string;
  completedAt?: string;
  completedLessons: string[];
  totalLessons: number;
}

interface ReportItem extends ProgressItem {
  userName: string;
  userDivision: string;
  userEmail: string;
}

const ReportsPage = () => {
  // --- State Management ---
  const [allReports, setAllReports] = useState<ReportItem[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterDivision, setFilterDivision] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, progressRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/progress')
        ]);

        const usersData = await usersRes.json();
        const progressData = await progressRes.json();
        
        let fetchedUsers: User[] = [];
        if (usersData.success) {
          fetchedUsers = usersData.data;
          setUsers(fetchedUsers);
          const uniqueDivisions = [...new Set(fetchedUsers.map((u: User) => u.division).filter(Boolean))];
          setDivisions(uniqueDivisions as string[]);
        }

        if (progressData.success) {
          const combinedData = progressData.data.map((progress: ProgressItem) => {
            const user = fetchedUsers.find((u: User) => u.id === progress.userId);
            return {
              ...progress,
              userName: user?.name || 'Unknown User',
              userDivision: user?.division || 'No Division',
              userEmail: user?.email || '-'
            };
          });
          setAllReports(combinedData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // --- Filtering & Searching ---
  useEffect(() => {
    let result = [...allReports];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.userName.toLowerCase().includes(searchLower) ||
        item.userEmail.toLowerCase().includes(searchLower) ||
        item.courseName.toLowerCase().includes(searchLower)
      );
    }
    
    if (filterDivision !== 'all') {
      result = result.filter(item => item.userDivision === filterDivision);
    }
    
    if (filterStatus !== 'all') {
      result = result.filter(item => item.status === filterStatus);
    }
    
    setFilteredReports(result);
    setCurrentPage(1); 
  }, [allReports, searchTerm, filterDivision, filterStatus]);

  // --- Pagination Logic ---
  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentItems = filteredReports.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // --- UI Helpers ---
  const getStatusBadge = (status: StatusType) => {
    const statusConfig = {
      'completed': { icon: CheckCircle, text: 'Selesai', className: 'bg-green-100 text-green-800 border border-green-200', iconColor: 'text-green-600' },
      'in-progress': { icon: Clock, text: 'Berjalan', className: 'bg-yellow-100 text-yellow-800 border border-yellow-200', iconColor: 'text-yellow-600' },
      'not-started': { icon: XCircle, text: 'Belum Mulai', className: 'bg-gray-100 text-gray-800 border border-gray-200', iconColor: 'text-gray-600' }
    };
    const config = statusConfig[status] || statusConfig['not-started'];
    const StatusIcon = config.icon;
    return (
      <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded-full ${config.className}`}>
        <StatusIcon size={14} className={config.iconColor} />
        <span className="text-xs font-medium">{config.text}</span>
      </div>
    );
  };

  const getProgressBar = (progress: number) => {
    const colorClass = progress === 100 ? 'bg-green-500' : 'bg-yellow-500';
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs font-bold text-black">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className={`${colorClass} h-2 rounded-full transition-all`} style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  };
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleExportExcel = () => {
    if (filteredReports.length === 0) {
      alert('Tidak ada data untuk diekspor');
      return;
    }

    const headers = [
      'Nama Pegawai',
      'Email',
      'Divisi',
      'Kursus',
      'Progress (%)',
      'Status',
      'Akses Terakhir',
      'Tanggal Selesai'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredReports.map(item => [
        `"${item.userName.replace(/"/g, '""')}"`,
        `"${item.userEmail.replace(/"/g, '""')}"`,
        `"${item.userDivision.replace(/"/g, '""')}"`,
        `"${item.courseName.replace(/"/g, '""')}"`,
        `"${item.progress}"`,
        `"${item.status === 'completed' ? 'Selesai' : item.status === 'in-progress' ? 'Berjalan' : 'Belum Mulai'}"`,
        `"${item.lastAccess ? new Date(item.lastAccess).toLocaleString('id-ID') : '-'}"`,
        `"${item.completedAt ? new Date(item.completedAt).toLocaleString('id-ID') : '-'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_belajar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Click Outside Handler ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#C5A059] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* --- Mobile Header --- */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-black">Laporan Belajar</h1>
            <p className="text-xs text-gray-600">Monitor progress pembelajaran</p>
          </div>
          <button onClick={handleExportExcel} className="flex items-center gap-2 bg-[#C5A059] text-black px-3 py-2 rounded-lg hover:bg-[#B08F4A] transition-colors font-semibold text-sm">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input type="text" placeholder="Cari nama, email, kursus..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full text-black pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none" />
          </div>
          <div className="relative" ref={filterRef}>
            <button onClick={() => setIsFilterOpen(!isFilterOpen)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium">
              <Filter size={16} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-30">
                <div className="p-3 border-b border-gray-200"><h3 className="text-sm font-semibold text-gray-800">Filter Data</h3></div>
                <div className="max-h-80 overflow-y-auto">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Divisi</h4>
                    <div className="space-y-1">
                      <button onClick={() => { setFilterDivision('all'); setIsFilterOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${filterDivision === 'all' ? 'bg-[#C5A059]/10 text-[#C5A059] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>Semua Divisi</button>
                      {divisions.map(div => <button key={div} onClick={() => { setFilterDivision(div); setIsFilterOpen(false); }} className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-all ${filterDivision === div ? 'bg-[#C5A059]/10 text-[#C5A059] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>{div}</button>)}
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Status</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => { setFilterStatus('all'); setIsFilterOpen(false); }} className={`flex items-center justify-center px-3 py-2.5 text-sm rounded-lg border transition-all ${filterStatus === 'all' ? 'border-[#C5A059] bg-[#FFF8E7] text-[#C5A059] font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>Semua</button>
                      <button onClick={() => { setFilterStatus('completed'); setIsFilterOpen(false); }} className={`flex items-center justify-center px-3 py-2.5 text-sm rounded-lg border transition-all ${filterStatus === 'completed' ? 'border-green-500 bg-green-50 text-green-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}><CheckCircle size={14} className="mr-1.5" />Selesai</button>
                      <button onClick={() => { setFilterStatus('in-progress'); setIsFilterOpen(false); }} className={`flex items-center justify-center px-3 py-2.5 text-sm rounded-lg border transition-all ${filterStatus === 'in-progress' ? 'border-yellow-500 bg-yellow-50 text-yellow-700 font-medium' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}><Clock size={14} className="mr-1.5" />Berjalan</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Desktop Header (Sticky) --- */}
      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="px-8 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Laporan Belajar</h1>
            <p className="text-gray-600 mt-1">Monitor progress pembelajaran pegawai</p>
          </div>
          <button onClick={handleExportExcel} className="flex items-center space-x-2 bg-[#C5A059] text-black px-5 py-2.5 rounded-lg hover:bg-[#B08F4A] transition-colors font-semibold">
            <Download size={20} /><span>Export Excel</span>
          </button>
        </div>
        <div className="px-8 pb-6 border-t border-gray-100">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input type="text" placeholder="Cari nama, email, kursus..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-sm" />
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <select value={filterDivision} onChange={(e) => setFilterDivision(e.target.value)} className={`appearance-none w-full md:w-48 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none bg-white text-sm cursor-pointer ${filterDivision === 'all' ? 'text-gray-500' : 'text-black'}`}>
                  <option value="all">Semua Divisi</option>
                  {divisions.map(div => <option key={div} value={div}>{div}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFilterStatus('all')} className={`flex items-center px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${filterStatus === 'all' ? 'border-[#C5A059] bg-[#FFF8E7] text-[#C5A059]' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}>Semua Status</button>
                <button onClick={() => setFilterStatus('completed')} className={`flex items-center px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${filterStatus === 'completed' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}><CheckCircle size={16} className="mr-2" />Selesai</button>
                <button onClick={() => setFilterStatus('in-progress')} className={`flex items-center px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${filterStatus === 'in-progress' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'}`}><Clock size={16} className="mr-2" />Berjalan</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="p-4 md:p-8">
        {/* --- Report Content --- */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {/* Mobile View */}
            <div className="md:hidden">
              {currentItems.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {currentItems.map((item) => (
                    <div key={item.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><span className="text-black font-bold text-sm">{item.userName.charAt(0)}</span></div>
                          <div>
                            <p className="font-semibold text-black text-sm">{item.userName}</p>
                            <p className="text-xs text-gray-500">{item.userDivision}</p>
                          </div>
                        </div>
                        {getStatusBadge(item.status)}
                      </div>
                      <p className="text-sm font-medium text-black mb-2">{item.courseName}</p>
                      <div className="mb-2">{getProgressBar(item.progress)}</div>
                      <div className="text-xs text-gray-500">Akses Terakhir: {formatDate(item.lastAccess)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">Tidak ada data yang sesuai.</div>
              )}
            </div>
            
            {/* Desktop View */}
            <table className="hidden md:table w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama Pegawai</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kursus</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Akses Terakhir</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tgl. Selesai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.length > 0 ? currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3"><span className="text-black font-bold">{item.userName.charAt(0)}</span></div>
                        <div>
                          <div className="text-sm font-semibold text-black">{item.userName}</div>
                          <div className="text-xs text-gray-500">{item.userEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-black">{item.courseName}</div>
                        <div className="text-xs text-gray-500">{item.userDivision}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="w-32">{getProgressBar(item.progress)}</div></td>
                    <td className="px-6 py-4">{getStatusBadge(item.status)}</td>
                    <td className="px-6 py-4"><div className="text-sm text-gray-600">{formatDate(item.lastAccess)}</div></td>
                    <td className="px-6 py-4"><div className="text-sm text-gray-600">{formatDate(item.completedAt)}</div></td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-500">Tidak ada data yang sesuai.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-xs md:text-sm text-gray-600">
                Halaman <span className="font-semibold">{currentPage}</span> dari <span className="font-semibold">{totalPages}</span> (Total <span className="font-semibold">{totalItems}</span> data)
              </div>
              <div className="flex items-center space-x-1">
                <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border disabled:opacity-50"><ChevronLeft size={16} /></button>
                <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border disabled:opacity-50"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;