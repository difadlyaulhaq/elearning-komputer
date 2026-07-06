'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Edit, Trash2, Loader, X, FolderOpen, ChevronDown, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  courseCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

// Modal Component
interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: any;
  setFormData: (data: any) => void;
  isSubmitting: boolean;
  isEditing: boolean;
}

const CategoryModal = ({ isOpen, onClose, onSubmit, formData, setFormData, isSubmitting, isEditing }: CategoryModalProps) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  if (!isOpen) return null;

  const iconOptions = ['📚', '💼', '💰', '🎓', '📊', '🛠️', '🌐', '📱', '🎯', '💡', '🔧', '📈'];
  const colorOptions = [
    { name: 'Emas', value: '#C5A059' },
    { name: 'Biru', value: '#3B82F6' },
    { name: 'Hijau', value: '#10B981' },
    { name: 'Merah', value: '#EF4444' },
    { name: 'Ungu', value: '#8B5CF6' },
    { name: 'Oranye', value: '#F59E0B' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg sm:text-xl font-bold text-black">
            {isEditing ? 'Edit Kategori' : 'Tambah Kategori Baru'}
          </h2>
          <button 
            onClick={onClose} 
            className="p-1 sm:p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Kategori *</label>
            <input
              type="text"
              required
              placeholder="Contoh: Marketing & Sales"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full text-black px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all text-sm sm:text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi</label>
            <textarea
              placeholder="Jelaskan kategori ini untuk apa..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={3}
              className="w-full text-black px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all text-sm sm:text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Icon Kategori</label>
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-full text-left px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]/50 focus:border-[#C5A059] outline-none transition-all flex items-center justify-between"
              >
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <span className="text-xl sm:text-2xl">{formData.icon}</span>
                  <span className="text-xs sm:text-sm text-gray-600">Pilih icon...</span>
                </div>
                <ChevronDown size={18} className="text-gray-500" />
              </button>
              {showIconPicker && (
                <div className="absolute z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 sm:p-3 grid grid-cols-4 sm:grid-cols-6 gap-1 sm:gap-2 max-h-40 sm:max-h-48 overflow-y-auto w-full">
                  {iconOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setFormData({...formData, icon: emoji});
                        setShowIconPicker(false);
                      }}
                      className={`p-2 sm:p-3 text-xl sm:text-2xl rounded-lg transition-all hover:bg-gray-50 flex items-center justify-center ${
                        formData.icon === emoji
                          ? 'bg-[#FFF8E7] scale-105 ring-1 sm:ring-2 ring-[#C5A059]'
                          : ''
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Warna Tema</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({...formData, color: color.value})}
                    className={`flex items-center space-x-2 p-2 sm:p-2.5 rounded-lg border transition-all ${
                      formData.color === color.value
                        ? 'border-[#C5A059] bg-[#FFF8E7]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-4 h-4 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs sm:text-sm font-medium text-black truncate">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50 text-sm sm:text-base"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 px-4 py-2.5 bg-[#C5A059] text-black rounded-lg hover:bg-[#B08F4A] font-semibold flex justify-center items-center transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin mr-2" size={18} />
                  <span>Menyimpan...</span>
                </>
              ) : (
                'Simpan Kategori'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface CategoryManagementProps {
  forceAction?: 'create' | 'edit';
  forceId?: string;
}

// Main Component
const CategoryManagement: React.FC<CategoryManagementProps> = ({ forceAction, forceId }) => {
  const router = useRouter();

  const handleCloseModal = () => {
    if (forceAction) {
      router.push('/admin/categories');
    } else {
      handleCloseModal();
    }
  };
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'

  const initialFormState = {
    name: '',
    description: '',
    icon: '📚',
    color: '#C5A059'
  };

  const [formData, setFormData] = useState(initialFormState);

  // Ref for closing filter dropdown when clicking outside
  const filterRef = useRef<HTMLDivElement>(null);

  // useEffect to handle click outside
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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      const data = await response.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Gagal mengambil data kategori:', error);
      toast.error('Gagal memuat data kategori');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClick = () => {
    router.push('/admin/categories/create');
  };

  const handleEditClick = (category: Category) => {
    router.push(`/admin/categories/${category.id}/edit`);
  };

  const showConfirmationToast = (message: string, onConfirm: () => void) => {
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
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex justify-center items-center text-sm"
              onClick={() => {
                toast.dismiss(t.id);
                onConfirm();
              }}
            >
              Hapus
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
    toast.loading(editingId ? 'Menyimpan perubahan...' : 'Menambahkan kategori...');

    try {
      let response;
      
      if (editingId) {
        response = await fetch(`/api/admin/categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        response = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }

      const result = await response.json();
      toast.dismiss();

      if (response.ok) {
        toast.success((t) => (
          <div className="flex items-center justify-between w-full">
            <span className="text-sm sm:text-base">{result.message}</span>
            <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        ), { duration: 3000 });
        handleCloseModal();
        setFormData(initialFormState);
        setEditingId(null);
        fetchCategories();
        router.refresh();
      } else {
        toast.error((t) => (
          <div className="flex items-center justify-between w-full">
            <span className="text-sm sm:text-base">{`Gagal: ${result.error}`}</span>
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
          <span className="text-sm sm:text-base">Terjadi kesalahan sistem.</span>
          <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
      ), { duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmMessage = `Hapus kategori "${name}"? Data ini tidak bisa dikembalikan.`;
    
    const performDelete = async () => {
      toast.loading('Menghapus kategori...');
      try {
        const response = await fetch(`/api/admin/categories/${id}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        toast.dismiss();

        if (response.ok) {
          toast.success((t) => (
            <div className="flex items-center justify-between w-full">
              <span className="text-sm sm:text-base">{result.message}</span>
              <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
          ), { duration: 3000 });
          fetchCategories();
          router.refresh();
        } else {
          toast.error((t) => (
            <div className="flex items-center justify-between w-full">
              <span className="text-sm sm:text-base">{`Gagal menghapus: ${result.error}`}</span>
              <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
          ), { duration: 3000 });
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        toast.dismiss();
        toast.error((t) => (
          <div className="flex items-center justify-between w-full">
            <span className="text-sm sm:text-base">Terjadi kesalahan saat menghapus kategori.</span>
            <button onClick={() => toast.dismiss(t.id)} className="p-1 rounded-full hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        ), { duration: 3000 });
      }
    };

    showConfirmationToast(confirmMessage, performDelete);
  };

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || cat.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {!isModalOpen ? (
        <>
      {/* Header Mobile */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-black">Kategori</h1>
            <p className="text-xs text-gray-600">Kelompokkan kursus</p>
          </div>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 bg-[#C5A059] text-black px-3 py-2 rounded-lg hover:bg-[#B08F4A] transition-colors font-semibold shadow-md hover:shadow-lg text-sm"
          >
            <Plus size={16} />
            <span>Tambah</span>
          </button>
        </div>
        
        {/* Mobile Search & Filter Row */}
        <div className="flex gap-2">
          {/* Mobile Search Bar - Small */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari kategori..."
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
                  <h3 className="text-sm font-semibold text-gray-800">Filter Status</h3>
                </div>
                <div className="max-h-60 overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm ${filterStatus === 'all' ? 'bg-[#C5A059]/10 text-[#C5A059] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Semua Status
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('active');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm ${filterStatus === 'active' ? 'bg-[#C5A059]/10 text-[#C5A059] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Aktif
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('inactive');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm ${filterStatus === 'inactive' ? 'bg-[#C5A059]/10 text-[#C5A059] font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    Nonaktif
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Active Filter Indicator */}
        {filterStatus !== 'all' && (
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Filter aktif:</span>
              <span className="text-xs font-medium bg-[#C5A059]/10 text-[#C5A059] px-2 py-1 rounded">
                {filterStatus === 'active' ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>
            <button 
              onClick={() => setFilterStatus('all')}
              className="text-xs text-red-500 hover:text-red-700"
            >
              Hapus filter
            </button>
          </div>
        )}
      </div>

      {/* Header Desktop */}
      <div className="hidden md:block bg-white border-b border-gray-200 p-4 md:px-8 md:py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-black">Manajemen Kategori</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Kelompokkan kursus berdasarkan topik</p>
          </div>
          <button
            onClick={handleAddClick}
            className="w-full md:w-auto flex items-center justify-center space-x-2 bg-[#C5A059] text-black px-4 sm:px-5 py-2.5 rounded-lg hover:bg-[#B08F4A] transition-colors font-semibold shadow-md hover:shadow-lg text-sm sm:text-base"
          >
            <Plus size={18} />
            <span>Buat Kategori</span>
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Desktop Search */}
        <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Cari kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-black pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Category Grid */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader className="animate-spin text-[#C5A059]" size={40} />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-lg p-6 sm:p-8 md:p-12 text-center">
            <FolderOpen className="mx-auto text-gray-300 mb-4 w-12 h-12 sm:w-16 sm:h-16" />
            <p className="text-gray-500 text-base sm:text-lg">
              {searchTerm || filterStatus !== 'all' ? 'Kategori tidak ditemukan' : 'Belum ada kategori dibuat'}
            </p>
            {(searchTerm || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                }}
                className="mt-4 text-[#C5A059] hover:text-[#B08F4A] font-medium text-sm sm:text-base"
              >
                Reset pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all overflow-hidden"
              >
                {/* Icon Section - Atas untuk semua ukuran */}
                <div
                  className="w-full h-32 flex items-center justify-center text-5xl"
                  style={{ backgroundColor: `${category.color}15` }}
                >
                  {category.icon}
                </div>
                
                {/* Content Section */}
                <div className="p-5">
                  {/* Header with Title and Actions */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-black mb-1 line-clamp-1">{category.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {category.description || 'Tidak ada deskripsi'}
                      </p>
                    </div>
                    <div className="flex space-x-2 ml-2">
                      <button
                        onClick={() => handleEditClick(category)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id, category.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Stats and Status */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="text-sm text-gray-600">
                        <span className="font-bold text-black">{category.courseCount}</span> Kursus
                      </span>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${category.status === 'active' 
                      ? 'bg-green-50 text-green-700 border border-green-100' 
                      : 'bg-gray-50 text-gray-600 border border-gray-100'
                    }`}>
                      {category.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      </>
      ) : (
        <div className="p-4 md:p-8">
          <CategoryModal
            isOpen={isModalOpen}
            onClose={() => handleCloseModal()}
            onSubmit={handleSubmit}
            formData={formData}
            setFormData={setFormData}
            isSubmitting={isSubmitting}
            isEditing={!!editingId}
          />
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;