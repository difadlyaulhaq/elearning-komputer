'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader, ChevronDown, Building2, User } from 'lucide-react';
import toast from 'react-hot-toast';

interface DivisionFormProps {
  id?: string;
}

export default function DivisionForm({ id }: DivisionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(!!id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const iconOptions = ['🏢', '💼', '💰', '📊', '🛠️', '👥', '🎯', '📱', '🌐', '💡', '🔧', '📈'];
  const colorOptions = [
    { name: 'Emas', value: '#0066FF' },
    { name: 'Biru', value: '#3B82F6' },
    { name: 'Hijau', value: '#10B981' },
    { name: 'Merah', value: '#EF4444' },
    { name: 'Ungu', value: '#8B5CF6' },
    { name: 'Oranye', value: '#F59E0B' }
  ];

  const [formData, setFormData] = useState({
    name: '',
    head: '',
    description: '',
    icon: '🏢',
    color: '#0066FF'
  });

  useEffect(() => {
    if (id) {
      const fetchDivision = async () => {
        try {
          // Fetch divisions and find the specific one to avoid backend changes
          const response = await fetch('/api/admin/divisions');
          const data = await response.json();
          if (data.success) {
            const div = data.data.find((d: any) => d.id === id);
            if (div) {
              setFormData({
                name: div.name || '',
                head: div.head || '',
                description: div.description || '',
                icon: div.icon || '🏢',
                color: div.color || '#0066FF'
              });
            } else {
              toast.error('Divisi tidak ditemukan');
              router.push('/admin/divisions');
            }
          }
        } catch (error) {
          console.error('Error fetching division:', error);
          toast.error('Gagal memuat data divisi');
        } finally {
          setIsLoading(false);
        }
      };
      fetchDivision();
    }
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama divisi wajib diisi');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading(id ? 'Menyimpan perubahan...' : 'Menambahkan divisi...');

    try {
      const url = id ? `/api/admin/divisions/${id}` : '/api/admin/divisions';
      const method = id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success(id ? 'Divisi berhasil diperbarui' : 'Divisi berhasil ditambahkan');
        router.push('/admin/divisions');
        router.refresh();
      } else {
        toast.error(result.error || 'Gagal menyimpan divisi');
      }
    } catch (error) {
      console.error('Error submitting division:', error);
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
          <span className="text-sm text-gray-500 font-medium">Memuat data divisi...</span>
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
            onClick={() => router.push('/admin/divisions')}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Dashboard</span>
              <span>/</span>
              <span>Divisi</span>
              <span>/</span>
              <span className="text-gray-900 font-medium">{id ? 'Edit' : 'Tambah Baru'}</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900 mt-0.5">
              {id ? 'Edit Divisi' : 'Tambah Divisi Baru'}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Form Card */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Nama Divisi *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Marketing & Sales"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Kepala Divisi</label>
                <input
                  type="text"
                  placeholder="Nama kepala divisi (opsional)"
                  value={formData.head}
                  onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                  className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] transition-all text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Contoh: Ahmad Fulan</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Deskripsi</label>
                <textarea
                  rows={4}
                  placeholder="Jelaskan tugas dan tanggung jawab divisi ini..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-black px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Icon Selection */}
                <div className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Ikon Divisi</label>
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-full text-left px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0066FF]/30 focus:border-[#0066FF] transition-all flex items-center justify-between bg-white text-gray-800 text-sm font-medium"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-xl">{formData.icon}</span>
                      <span className="text-gray-500 text-xs">Pilih ikon...</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-500" />
                  </button>

                  {showIconPicker && (
                    <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-3 grid grid-cols-6 gap-2 w-full max-h-48 overflow-y-auto">
                      {iconOptions.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, icon: emoji });
                            setShowIconPicker(false);
                          }}
                          className={`p-2.5 text-xl rounded-lg hover:bg-gray-50 flex items-center justify-center transition-all ${
                            formData.icon === emoji ? 'bg-[#E6F0FF] scale-105 ring-2 ring-[#0066FF]' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Warna Tema</label>
                  <div className="grid grid-cols-3 gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`flex items-center space-x-1.5 p-2 rounded-xl border transition-all ${
                          formData.color === color.value
                            ? 'border-[#0066FF] bg-[#E6F0FF] ring-1 ring-[#0066FF]'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div
                          className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color.value }}
                        />
                        <span className="text-[10px] font-bold text-gray-800 truncate">{color.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push('/admin/divisions')}
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
                  <span>{id ? 'Simpan Perubahan' : 'Simpan Divisi'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Column */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4 sticky top-28">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Preview Card</h3>
            <div className="border border-gray-150 rounded-xl p-4 bg-gray-50 flex flex-col items-center">
              <div className="w-full bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shadow-sm"
                    style={{ backgroundColor: `${formData.color}15`, color: formData.color }}
                  >
                    {formData.icon}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                    Aktif
                  </span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-base line-clamp-1">{formData.name || 'Nama Divisi'}</h4>
                  {formData.head && (
                    <div className="flex items-center gap-1.5 text-xs text-[#0066FF] font-semibold mt-1">
                      <User size={12} />
                      <span>{formData.head}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2 min-h-[2rem]">
                    {formData.description || 'Deskripsi singkat tugas dan tanggung jawab divisi ini...'}
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-gray-100 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Building2 size={13} />
                    0 Anggota
                  </span>
                  <span>Baru</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              Tampilan di atas merepresentasikan bagaimana divisi ini akan ditampilkan pada portal managemen organisasi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
