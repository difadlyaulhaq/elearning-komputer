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
  details?: {
    contentTitle?: string;
    userAgent?: string;
    fullscreen?: boolean;
    [key: string]: any;
  };
}

interface Column {
  header: string;
  accessor: string;
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
      
      // Filter hanya untuk upaya tangkapan layar (screenshot attempts)
      const screenshotActions = [
        'screenshot_attempt',
        'mobile_screenshot_gesture',
        'mobile_palm_gesture',
        'mobile_hardware_button',
        'mobile_hardware_combo',
        'mobile_power_double_click'
      ];
      
      const filteredData = data.data.filter((log: LogEntry) => 
        screenshotActions.includes(log.action)
      );

      setLogs(filteredData);
      setFilteredLogs(filteredData);
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
    setFilteredLogs(updatedLogs);
  }, [filters.userId, logs]);

  

  const columns: Column[] = [
    { header: 'Pengguna', accessor: 'userName', icon: User },
    { 
      header: 'Tindakan', 
      accessor: 'action', 
      icon: AlertCircle,
      render: (log: LogEntry) => {
        const labels: Record<string, string> = {
          'screenshot_attempt': 'Upaya Tangkapan Layar (Desktop)',
          'mobile_screenshot_gesture': 'Gestur Tangkapan Layar',
          'mobile_palm_gesture': 'Gestur Telapak Tangan',
          'mobile_hardware_button': 'Tombol Hardware',
          'mobile_hardware_combo': 'Kombinasi Tombol',
          'mobile_power_double_click': 'Double Click Power'
        };
        return <span>{labels[log.action] || log.action}</span>;
      }
    },
    { 
      header: 'Konten/Video', 
      accessor: 'contentTitle', 
      icon: FileText,
      render: (log: LogEntry) => <span>{log.details?.contentTitle || '-'}</span>
    },
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
          <h1 className="text-2xl font-bold text-white">Log Keamanan - Upaya Tangkapan Layar</h1>
          <p className="text-white">Riwayat kejadian deteksi upaya screenshot.</p>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Filter berdasarkan ID Pengguna"
            value={filters.userId}
            onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            className="text-black w-full px-4 py-2 border rounded-lg max-w-md"
          />
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
                        {col.render ? col.render(log) : (log as any)[col.accessor]}
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
