'use client';
import { Listbox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Menu, Transition } from '@headlessui/react';
import { Plus, Search, Edit, Trash2, UserX, UserCheck, Mail, Building, Loader, X, MoreVertical, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/shared/Button';
import { ResponsiveTable } from '@/components/shared/ResponsiveTable';
import React, { useState, useEffect, Fragment, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Definisikan tipe data User
interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  division: string;
  role: string;
  status: 'active' | 'inactive';
}

// Definisikan tipe data Division
interface Division {
  id: string;
  name: string;
}

// --- KOMPONEN MODAL ---
interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  isSubmitting: boolean;
  isEditing: boolean;
  divisions: Division[];
}

const UserFormModal = ({ isOpen, onClose, onSubmit, formData, setFormData, isSubmitting, isEditing, divisions }: UserFormModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 md:p-4 transition-opacity">
      <div className="bg-white rounded-none md:rounded-xl w-full h-full md:h-auto md:max-w-lg shadow-2xl transform transition-all flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-black">
            {isEditing ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              required
              placeholder="Contoh: Ahmad Fulan"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Kantor</label>
            <input
              type="email"
              required
              disabled={isEditing}
              placeholder="nama@alfajrumroh.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className={`w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg outline-none transition-all ${
                isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059]'
              }`}
            />
            {isEditing && <p className="text-xs text-gray-500 mt-1">Email tidak dapat diubah untuk menjaga integritas data.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Divisi</label>
              <select 
                required
                value={formData.division}
                onChange={(e) => setFormData({...formData, division: e.target.value})}
                className="w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all bg-white"
              >
                <option value="">Pilih Divisi</option>
                {divisions.length === 0 ? (
                  <option value="" disabled>Loading divisi...</option>
                ) : (
                  divisions.map((div) => (
                    <option key={div.id} value={div.name}>
                      {div.name}
                    </option>
                  ))
                )}
              </select>
              {divisions.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Belum ada divisi. Silakan buat divisi terlebih dahulu di menu Master Data.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
              <select 
                required
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full px-4 text-black py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all bg-white"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {isEditing ? 'Password Baru (Opsional)' : 'Password Default'}
            </label>
            <input
              type="password"
              placeholder={isEditing ? "Kosongkan jika tidak ingin mengganti" : "Opsional (default: Alfajr123!)"}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full text-black px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all"
            />
          </div>

          <div className="flex flex-col-reverse md:flex-row md:space-x-3 gap-3 md:gap-0 pt-4 mt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full md:flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || divisions.length === 0}
              className="w-full md:flex-1 px-4 py-2.5 bg-[#C5A059] text-black rounded-lg hover:bg-[#B08F4A] font-semibold flex justify-center items-center transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin mr-2" size={18} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                'Simpan Data'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface UserManagementProps {
  forceAction?: 'create' | 'edit';
  forceId?: string;
}

// --- KOMPONEN UTAMA ---
const UserManagement: React.FC<UserManagementProps> = ({ forceAction, forceId }) => {
  const router = useRouter();

  const handleCloseModal = () => {
    if (forceAction) {
      router.push('/admin/users');
    } else {
      setIsModalOpen(false);
    }
  };
  const [users, setUsers] = useState<User[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDivision, setFilterDivision] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // State untuk form & Edit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialFormState = {
    name: '',
    email: '',
    division: '',
    role: 'user',
    password: ''
  };
  
  const [formData, setFormData] = useState(initialFormState);

  // Ref untuk menutup dropdown ketika klik di luar
  const filterRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchDivisions();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error('Gagal mengambil data users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDivisions = async () => {
    try {
      const response = await fetch('/api/admin/divisions');
      const data = await response.json();
      if (data.success) {
        setDivisions(data.data.map((d: any) => ({ id: d.id, name: d.name })));
      }
    } catch (error) {
      console.error('Gagal mengambil data divisi:', error);
    }
  };

  const handleAddClick = () => {
    router.push('/admin/users/create');
  };

  const handleEditClick = (user: User) => {
    router.push(`/admin/users/${user.id}/edit`);
  };

  const showConfirmationToast = (message: string, onConfirm: () => void, confirmButtonColor: string = 'bg-red-600 hover:bg-red-700') => {
    toast(
      (t) => (
        <div className="flex flex-col items-start gap-3 p-2">
          <p className="font-semibold text-gray-800">{message}</p>
          <div className="w-full flex gap-2">
            <button
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm"
              onClick={() => toast.dismiss(t.id)}
            >
              Batal
            </button>
            <button
              className={`flex-1 px-4 py-2.5 text-white rounded-lg font-semibold flex justify-center items-center text-sm ${confirmButtonColor}`}
              onClick={() => {
                toast.dismiss(t.id);
                onConfirm();
              }}
            >
              Konfirmasi
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
      }
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    toast.loading(editingId ? 'Memperbarui data...' : 'Menambahkan pegawai...');

    try {
      let response;
      
      if (editingId) {
        response = await fetch(`/api/admin/users/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      
      toast.dismiss();
      if (response.ok) {
        handleCloseModal();
        setFormData(initialFormState);
        setEditingId(null);
        fetchUsers();
        toast.success((t) => (
          <div className="flex items-center justify-between w-full">
            <span>{`Pegawai berhasil ${editingId ? 'diperbarui' : 'ditambahkan'}!`}</span>
            <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        ), { duration: 3000 });
      } else {
        const errorData = await response.json();
        toast.error((t) => (
          <div className="flex items-center justify-between w-full">
            <span>{`Gagal: ${errorData.error}`}</span>
            <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        ), { duration: 3000 });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.dismiss();
      toast.error((t) => (
        <div className="flex items-center justify-between w-full">
          <span>Terjadi kesalahan sistem.</span>
          <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
      ), { duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const confirmMessage = newStatus === 'inactive' 
      ? 'Nonaktifkan pegawai ini? Mereka tidak akan bisa login lagi.' 
      : 'Aktifkan kembali pegawai ini?';

    const performToggle = async () => {
      toast.loading('Mengubah status...');
      try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        
        toast.dismiss();
        if (response.ok) {
          fetchUsers();
          toast.success((t) => (
            <div className="flex items-center justify-between w-full">
              <span>Status berhasil diubah!</span>
              <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
          ), { duration: 3000 });
        } else {
          toast.error((t) => (
            <div className="flex items-center justify-between w-full">
              <span>Gagal mengubah status.</span>
              <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
          ), { duration: 3000 });
        }
      } catch (error) {
        console.error('Error toggling status:', error);
        toast.dismiss();
        toast.error((t) => (
          <div className="flex items-center justify-between w-full">
            <span>Gagal mengubah status.</span>
            <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        ), { duration: 3000 });
      }
    };

    showConfirmationToast(confirmMessage, performToggle, newStatus === 'inactive' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700');
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmMessage = `Hapus permanen user "${userName}"? Aksi ini tidak dapat dibatalkan.`;

    const performDelete = async () => {
      toast.loading('Menghapus user...');
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });

        toast.dismiss();
        if (response.ok) {
          fetchUsers();
          toast.success((t) => (
            <div className="flex items-center justify-between w-full">
              <span>User berhasil dihapus!</span>
              <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
          ), { duration: 3000 });
        } else {
          const errorData = await response.json();
          toast.error((t) => (
            <div className="flex items-center justify-between w-full">
              <span>{`Gagal menghapus user: ${errorData.error}`}</span>
              <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
          ), { duration: 3000 });
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        toast.dismiss();
        toast.error((t) => (
          <div className="flex items-center justify-between w-full">
            <span>Terjadi kesalahan sistem saat menghapus user.</span>
            <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        ), { duration: 3000 });
      }
    };

    showConfirmationToast(confirmMessage, performDelete);
  };

  // Filter Logic
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDivision = filterDivision === 'all' || user.division.toLowerCase() === filterDivision.toLowerCase();
    return matchesSearch && matchesDivision;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {!isModalOpen ? (
        <>
      {/* Header Mobile */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-black">Manajemen Pengguna</h1>
            <p className="text-xs text-gray-600">Kelola data pegawai</p>
          </div>
          <Button
            variant="primary"
            icon={Plus}
            onClick={handleAddClick}
            size="sm"
          >
            Tambah
          </Button>
        </div>
        
        {/* Mobile Search & Filter Row */}
        <div className="flex gap-2">
          {/* Mobile Search Bar - Small */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari nama/email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-black pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
            />
          </div>
          
          {/* Mobile Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium"
            >
              <Filter size={16} />
            </button>
            
            {/* Dropdown Menu */}
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-800">Filter Divisi</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilterDivision('all');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm ${filterDivision === 'all' ? 'bg-[#C5A059]/10 text-[#C5A059] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Semua Divisi
                  </button>
                  {divisions.map((div) => (
                    <button
                      key={div.id}
                      onClick={() => {
                        setFilterDivision(div.name);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm ${filterDivision === div.name ? 'bg-[#C5A059]/10 text-[#C5A059] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      {div.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Active Filter Indicator */}
        {filterDivision !== 'all' && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Filter aktif:</span>
              <span className="text-xs font-medium bg-[#C5A059]/10 text-[#C5A059] px-2 py-1 rounded">
                {filterDivision}
              </span>
            </div>
            <button 
              onClick={() => setFilterDivision('all')}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Hapus filter
            </button>
          </div>
        )}
      </div>

      {/* Header & Filters Desktop */}
      <div className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4 md:px-8 md:py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-black">Manajemen Pengguna</h1>
              <p className="text-gray-600 mt-1">Kelola data pegawai dan akses sistem</p>
            </div>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleAddClick}
              className="w-full md:w-auto"
            >
              Tambah Pegawai
            </Button>
          </div>
        </div>
        <div className="px-8 pb-6 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-black pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none transition-all"
              />
            </div>
            <Listbox value={filterDivision} onChange={setFilterDivision}>
              <div className="relative">
                <Listbox.Button className="w-full px-4 py-2.5 text-left bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none cursor-pointer text-black">
                  <span className="block truncate">{filterDivision === 'all' ? 'Semua Divisi' : filterDivision}</span>
                  <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronUpDownIcon
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </span>
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  leave="transition ease-in duration-100"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                    <Listbox.Option
                      key="all-divisions"
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                        }`
                      }
                      value="all"
                    >
                      {({ selected }) => (
                        <>
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            Semua Divisi
                          </span>
                          {selected ? (
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Listbox.Option>
                    {divisions.map((div) => (
                      <Listbox.Option
                        key={div.id}
                        className={({ active }) =>
                          `relative cursor-default select-none py-2 pl-10 pr-4 ${
                            active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                          }`
                        }
                        value={div.name}
                      >
                        {({ selected }) => (
                          <>
                            <span
                              className={`block truncate ${
                                selected ? 'font-medium' : 'font-normal'
                              }`}
                            >
                              {div.name}
                            </span>
                            {selected ? (
                              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                                <CheckIcon className="h-5 w-5" aria-hidden="true" />
                              </span>
                            ) : null}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-8">
        {/* User Table */}
        <ResponsiveTable className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Pegawai</th>
                <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kontak</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Divisi</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col justify-center items-center">
                    <Loader className="animate-spin mb-2 text-[#C5A059]" size={32} />
                    <span className="text-sm">Memuat data...</span>
                  </div>
                </td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-gray-600">Tidak ada data pegawai yang ditemukan</p>
                      {(searchTerm || filterDivision !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('');
                            setFilterDivision('all');
                          }}
                          className="text-sm text-[#C5A059] hover:text-[#B08F4A] font-medium"
                        >
                          Hapus filter
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-brand-gold to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base shadow-md">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm md:text-base">{user.name}</p>
                          <div className="flex items-center md:hidden text-xs text-gray-500 mt-1">
                            <Mail size={12} className="mr-1" />
                            <span className="truncate max-w-[120px]">{user.email}</span>
                          </div>
                          <span className={`hidden md:inline text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide font-bold border ${user.role === 'admin'
                              ? 'bg-purple-100 text-purple-700 border-purple-200'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                            {user.role}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 text-gray-700">
                          <Mail size={14} className="text-brand-gold" />
                          <span className="text-sm font-medium">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <div className="flex items-center space-x-2 text-gray-600 bg-gray-50 px-3 py-1 rounded-lg w-fit border border-gray-100">
                        <Building size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold">{user.division}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${user.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {user.status === 'active' ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-3 md:py-4 text-right">
                      <div className="hidden md:flex items-center gap-2">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit Data"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.status === 'active' 
                              ? 'text-orange-600 hover:bg-orange-100' 
                              : 'text-green-600 hover:bg-green-100'
                          }`}
                          title={user.status === 'active' ? "Non-aktifkan" : "Aktifkan"}
                        >
                          {user.status === 'active' ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id, user.name)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Hapus User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="md:hidden">
                        <Menu as="div" className="relative inline-block text-left">
                          <div>
                            <Menu.Button className="inline-flex justify-center w-full px-2 py-2 text-sm font-medium text-gray-700 bg-white rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                              <MoreVertical className="w-5 h-5" aria-hidden="true" />
                            </Menu.Button>
                          </div>
                          <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                          >
                            <Menu.Items className="absolute right-0 w-48 mt-2 origin-top-right bg-white divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                              <div className="px-1 py-1">
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleEditClick(user)}
                                      className={`${
                                        active ? 'bg-blue-500 text-white' : 'text-gray-900'
                                      } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Data
                                    </button>
                                  )}
                                </Menu.Item>
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleToggleStatus(user.id, user.status)}
                                      className={`${
                                        active ? 'bg-yellow-500 text-white' : 'text-gray-900'
                                      } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                                    >
                                      {user.status === 'active' ? (
                                        <UserX className="w-4 h-4 mr-2" />
                                      ) : (
                                        <UserCheck className="w-4 h-4 mr-2" />
                                      )}
                                      {user.status === 'active' ? 'Non-aktifkan' : 'Aktifkan'}
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                              <div className="px-1 py-1">
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleDeleteUser(user.id, user.name)}
                                      className={`${
                                        active ? 'bg-red-500 text-white' : 'text-gray-900'
                                      } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Hapus User
                                    </button>
                                  )}
                                </Menu.Item>
                              </div>
                            </Menu.Items>
                          </Transition>
                        </Menu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ResponsiveTable>
      </div>

      {/* Render Modal */}
      </>
      ) : (
        <div className="p-4 md:p-8">
          <UserFormModal
            isOpen={isModalOpen}
            onClose={() => handleCloseModal()}
            onSubmit={handleSubmit}
            formData={formData}
            setFormData={setFormData}
            isSubmitting={isSubmitting}
            isEditing={!!editingId}
            divisions={divisions}
          />
        </div>
      )}
    </div>
  );
};

export default UserManagement;