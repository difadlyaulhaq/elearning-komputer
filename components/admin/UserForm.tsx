'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Division {
  id: string;
  name: string;
}

interface UserFormProps {
  id?: string;
}

export default function UserForm({ id }: UserFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    division: '',
    role: 'user',
    password: ''
  });

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // 1. Fetch divisions list
        const divResponse = await fetch('/api/admin/divisions');
        const divData = await divResponse.json();
        if (divData.success) {
          setDivisions(divData.data);
        }

        // 2. Fetch user data if editing
        if (id) {
          const userResponse = await fetch('/api/admin/users');
          const userData = await userResponse.json();
          if (userData.success) {
            const userObj = userData.data.find((u: any) => u.id === id);
            if (userObj) {
              setFormData({
                name: userObj.name || '',
                email: userObj.email || '',
                division: userObj.division || '',
                role: userObj.role || 'user',
                password: '' // Don't prefill password
              });
            } else {
              toast.error('Pegawai tidak ditemukan');
              router.push('/admin/users');
            }
          }
        }
      } catch (error) {
        console.error('Error loading user form data:', error);
        toast.error('Gagal memuat data formulir');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email wajib diisi');
      return;
    }
    if (!formData.division) {
      toast.error('Divisi wajib dipilih');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(id ? 'Memperbarui data...' : 'Menambahkan pegawai...');

    try {
      const url = id ? `/api/admin/users/${id}` : '/api/admin/users';
      const method = id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success(id ? 'Data pegawai berhasil diperbarui' : 'Pegawai berhasil ditambahkan');
        router.push('/admin/users');
        router.refresh();
      } else {
        toast.error(result.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error submitting user:', error);
      toast.dismiss(loadingToast);
      toast.error('Terjadi kesalahan koneksi');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader className="animate-spin text-[#0066FF]" size={32} />
          <span className="text-sm text-gray-500 font-medium">Memuat data pegawai...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/users')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Dashboard</span>
              <span>/</span>
              <span>Pegawai</span>
              <span>/</span>
              <span className="text-gray-900 font-medium">{id ? 'Edit' : 'Tambah Baru'}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">
              {id ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Nama Lengkap *</label>
              <input
                type="text"
                required
                placeholder="Contoh: Ahmad Fulan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] transition-all text-sm"
              />
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Kantor *</label>
              <input
                type="email"
                required
                disabled={!!id}
                placeholder="nama@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full text-black px-4 py-3 rounded-xl border border-gray-300 outline-none transition-all text-sm ${
                  id ? 'bg-gray-150 text-gray-500 cursor-not-allowed border-gray-200' : 'focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF]'
                }`}
              />
              {id && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Email tidak dapat diubah untuk menjaga integritas data login.
                </p>
              )}
            </div>

            {/* Division & Role */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Divisi *</label>
                <select
                  required
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
                  className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] transition-all text-sm bg-white"
                >
                  <option value="">Pilih Divisi</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.name}>
                      {div.name}
                    </option>
                  ))}
                </select>
                {divisions.length === 0 && (
                  <p className="text-[10px] text-amber-600 font-medium mt-1">
                    Belum ada divisi. Silakan buat divisi terlebih dahulu di menu Master Data.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Role Akses *</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] transition-all text-sm bg-white"
                >
                  <option value="user">User / Pegawai</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            {/* Default Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">
                {id ? 'Ganti Password (Opsional)' : 'Password Default'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={id ? 'Kosongkan jika tidak ingin diubah' : 'Opsional (default: Pegawai123!)'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full text-black px-4 pr-12 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {id 
                  ? 'Isi jika Anda ingin mereset password akun pegawai ini.' 
                  : 'Jika dikosongkan, password awal akun pegawai adalah Pegawai123!'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.push('/admin/users')}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-bold transition-all text-sm"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-[#0066FF] text-white font-bold rounded-xl hover:bg-[#0052CC] flex justify-center items-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-75 disabled:cursor-not-allowed text-sm"
              >
                {isSubmitting && <Loader className="animate-spin" size={16} />}
                <span>{id ? 'Simpan Perubahan' : 'Tambah Pegawai'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
