'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, User, FileText, Calendar, Clock, AlertCircle } from 'lucide-react';
import { ResponsiveTable } from '@/components/shared/ResponsiveTable';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  page: string;
  timestamp: string;
}

interface Column {
  header: string;
  accessor: keyof LogEntry;
  icon: React.ElementType;
  render?: (log: LogEntry) => React.ReactNode;
}

const SecurityLogPage = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ userId: '', action: '' });
  const { user } = useAuth();

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/security/log');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data.data);
      setFilteredLogs(data.data);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message === 'Failed to fetch logs' ? 'Gagal memuat log' : err.message);
      } else {
        setError('Terjadi kesalahan tidak dikenal');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchLogs();
    }
  }, [user, fetchLogs]);

  useEffect(() => {
    let updatedLogs = logs;
    if (filters.userId) {
      updatedLogs = updatedLogs.filter(log => log.userId.includes(filters.userId));
    }
    if (filters.action) {
      updatedLogs = updatedLogs.filter(log => log.action === filters.action);
    }
    setFilteredLogs(updatedLogs);
  }, [filters, logs]);

  

  const columns: Column[] = [
    { header: 'Pengguna', accessor: 'userName', icon: User },
    { header: 'Tindakan', accessor: 'action', icon: AlertCircle },
    { header: 'Halaman', accessor: 'page', icon: FileText },
    {
      header: 'Waktu',
      accessor: 'timestamp',
      icon: Calendar,
      render: (log: LogEntry) => (
        <span>
          {format(new Date(log.timestamp), 'PPP p')}
        </span>
      ),
    },
  ];

  if (!user || user.role !== 'admin') {
    return <div className="p-8">Akses Ditolak. Anda harus menjadi admin untuk melihat halaman ini.</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center mb-6">
        <Shield size={32} className="text-[#C5A059] mr-4" />
        <div>
          <h1 className="text-2xl font-bold text-white">Log Keamanan</h1>
          <p className="text-white">Riwayat kejadian terkait keamanan.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Filter berdasarkan ID Pengguna"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            className="text-black w-full px-4 py-2 border rounded-lg"
          />
          <select
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            className="text-black w-full px-4 py-2 border rounded-lg"
          >
            <option value="">Semua Tindakan</option>
            <option value="screenshot_attempt">Upaya Tangkapan Layar</option>
            <option value="recording_detected">Perekaman Terdeteksi</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center">Memuat log...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : (
          <ResponsiveTable>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th key={col.accessor} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    {columns.map((col) => (
                      <td key={col.accessor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {col.render ? col.render(log) : log[col.accessor]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </div>
    </div>
  );
};


export default SecurityLogPage;
