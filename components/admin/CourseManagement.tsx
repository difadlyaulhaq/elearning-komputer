'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Eye, Users, Video, X, Save, BookText, Youtube, Loader2, Link as LinkIcon, ChevronDown, Search, Menu, Grid, Filter, PlayCircle, FileText, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { Course, Section, Lesson, Category, User, Division } from '@/types';
import BunnyPlayer from '../learning/BunnyPlayer';
import VdoCipherPlayer from '../learning/VdoCipherPlayer';

import { FileUploader } from '@/components/admin/FileUploader';

// Helper for YouTube ID
const getYouTubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Modal Preview untuk Kursus
export const CoursePreviewModal: React.FC<{
  previewData: Course;
  onClose: () => void;
}> = ({ previewData, onClose }) => {
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Initialize expanded sections
  useEffect(() => {
    if (previewData.sections) {
      const initial: Record<string, boolean> = {};
      previewData.sections.forEach(s => initial[s.id] = true);
      setExpandedSections(initial);
    }
  }, [previewData]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({...prev, [sectionId]: !prev[sectionId]}));
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const id = getYouTubeId(url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  };

  const renderContent = () => {
    if (!activeLesson) {
      return (
        <div className="space-y-6">
           {/* Course Overview */}
           <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 shadow-md">
             <img 
               src={previewData.coverImage || previewData.thumbnail || "/logo-alfajr.png"} 
               className="w-full h-full object-cover"
               alt="Cover"
               onError={(e) => { e.currentTarget.src = "/logo-alfajr.png"; }}
             />
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <button 
                  onClick={() => {
                    const firstLesson = previewData.sections?.[0]?.lessons?.[0];
                    if (firstLesson) setActiveLesson(firstLesson);
                  }}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105 shadow-lg border border-yellow-500"
                >
                  <PlayCircle size={24} />
                  <span>Mulai Kursus</span>
                </button>
             </div>
           </div>
           
           <div className="bg-white p-6 rounded-xl border shadow-sm">
             <h1 className="text-2xl font-bold text-gray-900">{previewData.title}</h1>
             <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold uppercase tracking-wider">
                  {previewData.categoryName}
                </span>
                <span className="text-gray-500 text-sm font-medium">•</span>
                <span className="text-gray-500 text-sm font-medium capitalize">{previewData.level}</span>
             </div>
             
             <div className="mt-6">
                <h3 className="text-lg font-bold mb-3 text-gray-900 border-b pb-2">Deskripsi Kursus</h3>
                <div className="prose prose-sm md:prose-base max-w-none text-gray-700">
                  <MarkdownRenderer content={previewData.description || 'Tidak ada deskripsi.'} />
                </div>
             </div>
           </div>
        </div>
      );
    }

    const isVideo = ['youtube', 'bunny', 'vdocipher', 'video-upload'].includes(activeLesson.contentType);

    return (
      <div className="space-y-6 animate-fadeIn">
         {/* Media Player/Display */}
         {activeLesson.contentType === 'youtube' && activeLesson.url && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-xl ring-1 ring-gray-900/10">
               <iframe
                 src={getYouTubeEmbedUrl(activeLesson.url) || ''}
                 className="w-full h-full"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                 allowFullScreen
               />
            </div>
         )}
         
         {activeLesson.contentType === 'bunny' && activeLesson.url && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-xl ring-1 ring-gray-900/10">
                <BunnyPlayer 
                  videoId={activeLesson.url}
                  onEnded={() => {}}
                  onTimeUpdate={() => {}}
                />
            </div>
         )}

         {activeLesson.contentType === 'video-upload' && activeLesson.url && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-xl ring-1 ring-gray-900/10">
               <video 
                 src={activeLesson.url} 
                 className="w-full h-full" 
                 controls 
               />
            </div>
         )}

         {activeLesson.contentType === 'image-upload' && activeLesson.url && (
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-200">
               <img 
                 src={activeLesson.url} 
                 alt={activeLesson.title} 
                 className="w-full h-auto"
               />
            </div>
         )}

         {activeLesson.contentType === 'file-upload' && activeLesson.url && (
            <div className="p-8 bg-blue-50 border border-blue-200 rounded-xl text-center">
               <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <FileText size={32} />
               </div>
               <h3 className="text-xl font-bold text-gray-900 mb-2">File Materi</h3>
               <p className="text-gray-600 mb-6">Materi ini berupa file yang dapat diunduh atau dibuka.</p>
               <a 
                 href={activeLesson.url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
               >
                 Buka File
               </a>
            </div>
         )}

         {activeLesson.contentType === 'vdocipher' && activeLesson.url && (
            <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-xl ring-1 ring-gray-900/10">
                <VdoCipherPlayer videoId={activeLesson.url} />
            </div>
         )}

         {/* Header */}
         <div className="border-b pb-4">
            <h2 className="text-2xl font-bold text-gray-900">{activeLesson.title}</h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
               {isVideo ? <Video size={14}/> : <BookText size={14}/>}
               <span className="capitalize">{activeLesson.contentType}</span>
               {activeLesson.duration && <span>• {activeLesson.duration} menit</span>}
            </p>
         </div>

         {/* Text Content */}
         {activeLesson.contentType === 'text' && activeLesson.textContent && (
           <div className="prose max-w-none p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
              <MarkdownRenderer content={activeLesson.textContent} />
           </div>
         )}

         {/* Attachments */}
         {activeLesson.attachmentUrl && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between hover:bg-blue-100/50 transition-colors">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <LinkIcon size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{activeLesson.attachmentName || 'Lampiran Materi'}</p>
                    <p className="text-xs text-blue-600">Klik tombol di kanan untuk membuka</p>
                  </div>
               </div>
               <a 
                 href={activeLesson.attachmentUrl} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
               >
                 Buka Lampiran
               </a>
            </div>
         )}
      </div>
    )
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-gray-50 w-full h-full md:rounded-2xl overflow-hidden flex flex-col shadow-2xl max-w-[1600px] border border-white/10">
        
        {/* Modal Header */}
        <div className="h-16 border-b flex items-center justify-between px-4 bg-white shadow-sm z-20 shrink-0">
             <div className="flex items-center gap-3 min-w-0">
                <button onClick={onClose} className="md:hidden p-2 -ml-2 text-gray-500">
                   <ChevronLeft size={24} />
                </button>
                <div className="flex flex-col">
                  <h3 className="font-bold text-lg text-gray-900 truncate">Preview Mode</h3>
                  <p className="text-xs text-yellow-700 truncate max-w-[200px] md:max-w-md">{previewData.title}</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full transition-colors">
                <X size={20} />
             </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
           
           {/* Main Content Area */}
           <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-thin scrollbar-thumb-gray-300">
              <div className="max-w-4xl mx-auto pb-20 md:pb-0">
                 {renderContent()}
              </div>
           </div>

           {/* Sidebar Navigation (Desktop) */}
           <div className="w-80 bg-white border-l border-gray-200 flex-col hidden md:flex shrink-0">
              <div className="p-4 border-b bg-gray-50">
                 <h4 className="font-bold text-gray-900">Materi Kursus</h4>
                 <div className="flex items-center justify-between mt-1">
                   <p className="text-xs text-gray-500">
                      {previewData.sections?.reduce((acc, s) => acc + s.lessons.length, 0)} Pelajaran
                   </p>
                   <span className="text-xs text-yellow-700 font-medium">
                     {Math.round(previewData.sections?.reduce((acc, s) => acc + s.lessons.reduce((d, l) => d + (parseInt(l.duration || '0')), 0), 0) || 0)} Menit Total
                   </span>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
                 {previewData.sections?.map((section, idx) => (
                    <div key={section.id} className="bg-white">
                       <button 
                         onClick={() => toggleSection(section.id)}
                         className="flex items-center justify-between w-full text-left mb-2 group py-1"
                       >
                          <span className="font-bold text-xs text-gray-500 uppercase tracking-wider group-hover:text-black transition-colors">
                             Bagian {idx + 1}: {section.title}
                          </span>
                          <ChevronDown 
                            size={14} 
                            className={`text-gray-400 transition-transform duration-200 ${expandedSections[section.id] ? 'rotate-180' : ''}`}
                          />
                       </button>
                       
                       {expandedSections[section.id] && (
                          <div className="space-y-1">
                             {section.lessons.map((lesson) => (
                                <button
                                  key={lesson.id}
                                  onClick={() => setActiveLesson(lesson)}
                                  className={`w-full text-left p-2.5 rounded-lg text-sm flex items-start gap-3 transition-all duration-200 border ${
                                    activeLesson?.id === lesson.id 
                                      ? 'bg-yellow-500 text-white border-yellow-500 shadow-md transform scale-[1.02]' 
                                      : 'bg-gray-50 text-gray-700 border-transparent hover:bg-gray-100 hover:border-gray-200'
                                  }`}
                                >
                                   <div className={`mt-0.5 shrink-0 ${activeLesson?.id === lesson.id ? 'text-white' : 'text-yellow-600'}`}>
                                      {['youtube', 'bunny', 'vdocipher', 'video-upload'].includes(lesson.contentType) ? <PlayCircle size={16} /> : lesson.contentType === 'image-upload' ? <ImageIcon size={16} /> : <FileText size={16} />}
                                   </div>
                                   <span className={`line-clamp-2 text-xs md:text-sm ${activeLesson?.id === lesson.id ? 'font-semibold' : ''}`}>
                                      {lesson.title}
                                   </span>
                                </button>
                             ))}
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        </div>
        
        {/* Mobile Playlist Drawer/List */}
        <div className="md:hidden border-t bg-white max-h-[40vh] overflow-y-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
           <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
              <h4 className="font-bold text-gray-900 text-sm">Daftar Materi</h4>
              <span className="text-xs text-gray-500">
                {previewData.sections?.reduce((acc, s) => acc + s.lessons.length, 0)} Video
              </span>
           </div>
           <div className="p-3 space-y-4">
             {previewData.sections?.map((section, idx) => (
                <div key={section.id}>
                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                      Bagian {idx + 1}: {section.title}
                   </p>
                   <div className="space-y-1">
                     {section.lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson)}
                          className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                            activeLesson?.id === lesson.id 
                              ? 'bg-yellow-500 text-white font-semibold shadow-sm' 
                              : 'bg-gray-50 border border-gray-100 text-gray-700 active:bg-gray-200'
                          }`}
                        >
                           <div className={activeLesson?.id === lesson.id ? 'text-white' : 'text-gray-400'}>
                             {['youtube', 'bunny', 'vdocipher', 'video-upload'].includes(lesson.contentType) ? <PlayCircle size={16} /> : lesson.contentType === 'image-upload' ? <ImageIcon size={16} /> : <FileText size={16} />}
                           </div>
                           <span className="truncate text-xs">{lesson.title}</span>
                        </button>
                     ))}
                   </div>
                </div>
             ))}
           </div>
        </div>

      </div>
    </div>
  );
};

interface CourseManagementProps {
  initialCourses: Course[];
  initialCategories: Category[];
}

const CourseManagement: React.FC<CourseManagementProps> = ({ initialCourses, initialCategories }) => {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchTermUsers, setSearchTermUsers] = useState<string>('');
  const [allDivisions, setAllDivisions] = useState<Division[]>([]);
  const [searchTermDivisions, setSearchTermDivisions] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State untuk tampilan mobile
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // State untuk modal
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<Course | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  // Ref for filter dropdown
  const filterRef = useRef<HTMLDivElement>(null);

  // State form data
  const [formData, setFormData] = useState<Partial<Course>>({
    title: '',
    categoryId: '',
    level: 'basic',
    description: '',
    coverImage: '',
    thumbnail: '',
    status: 'draft',
    sections: [],
    enrolledUserIds: [],
    enrolledDivisionIds: []
  });
  const [initialFormData, setInitialFormData] = useState<Partial<Course>>({
    title: '',
    categoryId: '',
    level: 'basic',
    description: '',
    coverImage: '',
    thumbnail: '',
    status: 'draft',
    sections: [],
    enrolledUserIds: [],
    enrolledDivisionIds: []
  });

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [tempLesson, setTempLesson] = useState<Partial<Lesson>>({
    title: '',
    contentType: 'video-upload',
    url: '',
    textContent: '',
    duration: '',
    watermark: true,
    forceComplete: true,
    attachmentName: '',
    attachmentUrl: ''
  });

  // Fetch data tambahan
  useEffect(() => {
    const fetchRequiredData = async () => {
      try {
        const [usersRes, divisionsRes, categoriesRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/divisions'),
          fetch('/api/admin/categories'),
        ]);

        const usersData = await usersRes.json();
        const divisionsData = await divisionsRes.json();
        const categoriesData = await categoriesRes.json();

        if (usersData.success) setAllUsers(usersData.data);
        if (divisionsData.success) setAllDivisions(divisionsData.data);
        if (categoriesData.success) setCategories(categoriesData.data);

      } catch (error) {
        console.error('Error fetching required data:', error);
        toast.error('Gagal memuat data esensial', { duration: 3000 });
      }
    };

    fetchRequiredData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter courses untuk pencarian
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.categoryName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || course.categoryId === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Helper functions
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const resetForm = () => {
    const initialCourseState: Partial<Course> = {
      title: '',
      categoryId: '',
      level: 'basic',
      description: '',
      coverImage: '',
      thumbnail: '',
      status: 'draft',
      sections: [],
      enrolledUserIds: [],
      enrolledDivisionIds: []
    };
    setFormData(initialCourseState);
    setInitialFormData(initialCourseState);
    setTempLesson({ 
      title: '', 
      contentType: 'video-upload', 
      url: '', 
      textContent: '', 
      duration: '', 
      watermark: true, 
      forceComplete: true, 
      attachmentName: '', 
      attachmentUrl: '' 
    });
    setCurrentStep(1);
    setIsEditing(false);
    setEditId(null);
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
      { duration: 10000 }
    );
  };

  // Handlers
  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (course: Course) => {
    setFormData(course);
    setInitialFormData(course);
    setEditId(course.id);
    setIsEditing(true);
    setCurrentStep(1);
    setShowModal(true);
  };

  const handleOpenPreview = (course: Course) => {
    setPreviewData(course);
    setShowPreview(true);
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmMessage = `Hapus kursus "${title}"? Tindakan ini tidak dapat dibatalkan.`;
    
    const performDelete = async () => {
      toast.loading('Menghapus kursus...');
      try {
        const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
        const data = await res.json();

        toast.dismiss();
        if (res.ok) {
          toast.success('Kursus berhasil dihapus!', { duration: 3000 });
          router.refresh();
        } else {
          toast.error(`Gagal: ${data.error || 'Terjadi kesalahan'}`, { duration: 3000 });
        }
      } catch (error: any) {
        console.error('Delete error:', error);
        toast.dismiss();
        toast.error(`Terjadi kesalahan sistem: ${error.message}`, { duration: 3000 });
      }
    };

    showConfirmationToast(confirmMessage, performDelete);
  };

  const handleSaveAndContinue = async () => {
    if (!formData.title || !formData.categoryId) {
      return toast.error('Judul dan Kategori wajib diisi', { duration: 3000 });
    }
    
    setIsLoading(true);
    const loadingToast = toast.loading('Menyimpan perubahan...');
    
    const url = isEditing ? `/api/admin/courses/${editId}` : '/api/admin/courses';
    const method = isEditing ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      });
      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Gagal menyimpan progres.');
      }
      
      const courseId = isEditing ? editId : result.data.id;
      if (!courseId) {
        throw new Error("Tidak menerima ID kursus dari server.");
      }

      if (!isEditing) {
        setEditId(courseId);
        setIsEditing(true);
      }
      
      // Re-fetch the definitive state
      const refetchRes = await fetch(`/api/admin/courses/${courseId}`);
      const updatedCourseResult = await refetchRes.json();

      toast.dismiss(loadingToast);

      if (updatedCourseResult.success) {
        setFormData(updatedCourseResult.data);
        setInitialFormData(updatedCourseResult.data);
        toast.success('Perubahan berhasil disimpan!', { duration: 3000 });
        router.refresh();
        setCurrentStep(prev => prev + 1);
      } else {
        throw new Error('Gagal mengambil data terbaru setelah menyimpan.');
      }
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(`Gagal: ${error.message}`, { duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    setIsLoading(true);
    if (!formData.title || !formData.categoryId) {
      toast.error('Judul dan Kategori wajib diisi', { duration: 3000 });
      setIsLoading(false);
      return;
    }
    const loadingToast = toast.loading('Menyimpan kursus...');
    
    try {
      const url = isEditing ? `/api/admin/courses/${editId}` : '/api/admin/courses';
      const method = isEditing ? 'PATCH' : 'POST';
      const res = await fetch(url, { 
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(formData) 
      });
      const result = await res.json();
      
      toast.dismiss(loadingToast);
      if (result.success) {
        toast.success(`Kursus berhasil ${isEditing ? 'diperbarui' : 'dibuat'}!`, { duration: 3000 });
        setShowModal(false);
        router.refresh();
      } else {
        toast.error(`Gagal: ${result.error}`, { duration: 3000 });
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.dismiss(loadingToast);
      toast.error('Terjadi kesalahan sistem', { duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  // Section & Lesson handlers
  const addSection = () => setFormData(prev => ({ 
    ...prev, 
    sections: [...(prev.sections || []), { 
      id: Date.now().toString(), 
      title: `Bab ${(prev.sections?.length || 0) + 1}`, 
      order: prev.sections?.length || 0, 
      lessons: [] 
    }] 
  }));

  const updateSectionTitle = (index: number, title: string) => { 
    const newSections = [...(formData.sections || [])]; 
    newSections[index].title = title; 
    setFormData(prev => ({ ...prev, sections: newSections })); 
  };

  const deleteSection = (index: number) => setFormData(prev => ({ 
    ...prev, 
    sections: (prev.sections || []).filter((_, i) => i !== index) 
  }));

  const handleStartEditLesson = (lesson: Lesson, sectionId: string) => { 
    setActiveSectionId(sectionId); 
    setEditingLessonId(lesson.id); 
    setTempLesson(lesson); 
  };

  const handleCancelEditLesson = () => { 
    setActiveSectionId(null); 
    setEditingLessonId(null); 
    setTempLesson({ 
      title: '', 
      contentType: 'video-upload', 
      url: '', 
      textContent: '', 
      duration: '', 
      watermark: true, 
      forceComplete: true, 
      attachmentName: '', 
      attachmentUrl: '' 
    }); 
  };

  const handleDeleteLesson = (lessonId: string, sectionId: string) => {
    const confirmMessage = 'Anda yakin ingin menghapus materi ini dari daftar?';
    
    const performDelete = () => {
      const newSections = (formData.sections || []).map(s => 
        s.id === sectionId ? { ...s, lessons: s.lessons.filter(l => l.id !== lessonId) } : s
      );
      setFormData(prev => ({ ...prev, sections: newSections }));
      toast.success('Materi dihapus dari daftar.', { duration: 3000 });
    };

    showConfirmationToast(confirmMessage, performDelete);
  };

  const handleSaveLesson = (sectionId: string) => {
    if (!tempLesson.title) return toast.error('Judul materi wajib diisi', { duration: 3000 });
    if (tempLesson.contentType === 'youtube' && !tempLesson.url) return toast.error('URL materi wajib diisi', { duration: 3000 });
    if (tempLesson.contentType === 'text' && !tempLesson.textContent) return toast.error('Konten artikel wajib diisi', { duration: 3000 });

    const lessonData = { ...tempLesson, id: editingLessonId || Date.now().toString() } as Lesson;
    const newSections = (formData.sections || []).map(s => {
      if (s.id === sectionId) {
        const newLessons = editingLessonId 
          ? s.lessons.map(l => l.id === editingLessonId ? lessonData : l) 
          : [...s.lessons, lessonData];
        return { ...s, lessons: newLessons };
      }
      return s;
    });
    setFormData(prev => ({ ...prev, sections: newSections }));
    handleCancelEditLesson();
    toast.success('Materi berhasil disimpan sementara!', { duration: 3000 });
  };

  const handleRichTextChange = useCallback((content: string) => {
    setTempLesson(prev => ({...prev, textContent: content}));
  }, [setTempLesson]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialFormData);

  // Mobile Course Card Component
  const MobileCourseCard = ({ course }: { course: Course }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="h-40 bg-gray-200 relative">
        <img 
          src={course.thumbnail || course.coverImage || '/logo-alfajr.png'} 
          alt={course.title} 
          className="w-full h-full object-cover" 
        />
        <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${course.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
          {course.status === 'active' ? 'Aktif' : 'Draft'}
        </span>
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-[#C5A059] shadow-sm">
          {course.categoryName}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-black mb-2 line-clamp-1" title={course.title}>
          {course.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <span className="flex items-center">
            <Video size={12} className="mr-1"/> 
            {course.sections?.reduce((acc, s) => acc + s.lessons.length, 0) || 0} Materi
          </span>
          <span className="flex items-center">
            <Users size={12} className="mr-1"/> 
            {course.totalStudents} Peserta
          </span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => handleOpenPreview(course)}
            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs flex items-center justify-center"
          >
            <Eye size={14} className="mr-1" /> Preview
          </button>
          <button 
            onClick={() => handleOpenEdit(course)}
            className="flex-1 py-2 bg-[#FFF8E7] text-[#C5A059] rounded hover:bg-[#FFF3D6] text-xs flex items-center justify-center"
          >
            <Edit size={14} className="mr-1" /> Edit
          </button>
          <button 
            onClick={() => handleDelete(course.id, course.title)}
            className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-black">Kelola Kursus</h1>
            <p className="text-xs text-gray-600">Buat dan kelola materi pembelajaran</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-[#C5A059] text-black px-3 py-2 rounded-lg hover:bg-[#B08F4A] transition-colors font-semibold shadow-md text-sm"
          >
            <Plus size={16} />
            <span>Tambah</span>
          </button>
        </div>
        
        {/* Mobile Search & Filters */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Cari kursus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-black pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg bg-white hover:bg-gray-50 text-sm font-medium"
            >
              <Filter size={16} />
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-800">Filter & Tampilan</h3>
                </div>
                <div className="p-3 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Kategori</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border text-gray-700 border-gray-300 rounded-lg focus:outline-none bg-white"
                    >
                      <option value="all">Semua Kategori</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Tampilan</span>
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md text-sm flex-1 flex justify-center ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#C5A059]' : 'text-gray-500'}`}
                      >
                        <Grid size={16} />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md text-sm flex-1 flex justify-center ${viewMode === 'list' ? 'bg-white shadow-sm text-[#C5A059]' : 'text-gray-500'}`}
                      >
                        <Menu size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Course List/Grid */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-3' : 'space-y-3'}>
          {filteredCourses.map((course) => (
            <MobileCourseCard key={course.id} course={course} />
          ))}
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">Tidak ada kursus ditemukan</p>
            {searchTerm || filterCategory !== 'all' ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCategory('all');
                }}
                className="mt-2 text-[#C5A059] hover:text-[#B08F4A] font-medium text-sm"
              >
                Reset pencarian
              </button>
            ) : (
              <button
                onClick={handleOpenAdd}
                className="mt-2 text-[#C5A059] hover:text-[#B08F4A] font-medium text-sm"
              >
                Buat kursus pertama
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block bg-white border-b border-gray-200 p-4 md:px-8 md:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">Kelola Kursus</h1>
            <p className="text-gray-600 mt-1">Buat dan kelola materi pembelajaran</p>
          </div>
          <button 
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 bg-[#C5A059] text-black px-5 py-2.5 rounded-lg hover:bg-[#B08F4A] transition-colors font-semibold shadow-md"
          >
            <Plus size={20} />
            <span>Buat Kursus Baru</span>
          </button>
        </div>
      </div>

      {/* Desktop Content */}
      <div className="hidden md:block p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
              <div className="h-48 bg-gray-200 relative">
                <img 
                  src={course.thumbnail || course.coverImage || '/logo-alfajr.png'} 
                  alt={course.title} 
                  className="w-full h-full object-cover" 
                />
                <span className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-bold ${course.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                  {course.status === 'active' ? 'Aktif' : 'Draft'}
                </span>
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-[#C5A059] shadow-sm">
                  {course.categoryName}
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-black mb-2 line-clamp-1" title={course.title}>
                  {course.title}
                </h3>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span className="flex items-center">
                    <Video size={14} className="mr-1"/> 
                    {course.sections?.reduce((acc, s) => acc + s.lessons.length, 0) || 0} Materi
                  </span>
                  <span className="flex items-center">
                    <Users size={14} className="mr-1"/> 
                    {course.totalStudents} Peserta
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenPreview(course)}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 font-medium text-sm flex items-center justify-center"
                  >
                    <Eye size={16} className="mr-1" /> Preview
                  </button>
                  <button 
                    onClick={() => handleOpenEdit(course)}
                    className="flex-1 py-2 bg-[#FFF8E7] text-[#C5A059] rounded hover:bg-[#FFF3D6] font-medium text-sm flex items-center justify-center"
                  >
                    <Edit size={16} className="mr-1" /> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(course.id, course.title)}
                    className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal untuk Create/Edit Course */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 md:p-4">
          <div className="bg-white w-full h-full md:w-full md:max-w-5xl md:h-[90vh] md:rounded-xl flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 md:p-6 border-b">
              <h2 className="text-lg md:text-xl font-bold text-black">
                {isEditing ? 'Edit Kursus' : 'Buat Kursus Baru'}
              </h2>
              <button 
                onClick={() => setShowModal(false)}
                disabled={isLoading}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={20} className="text-gray-400 hover:text-red-500" />
              </button>
            </div>
            
            {/* Stepper */}
            <div className="flex justify-center py-4 bg-gray-50 border-b">
              <div className="flex items-center space-x-1 md:space-x-4">
                <button 
                  onClick={() => setCurrentStep(1)}
                  disabled={isLoading}
                  className={`px-3 md:px-4 py-2 rounded-full flex items-center space-x-2 ${currentStep === 1 ? 'bg-[#FFF8E7] text-[#C5A059] border border-[#C5A059]' : 'text-gray-400'}`}
                >
                  <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">
                    1
                  </span>
                  <span className="font-semibold text-xs md:text-sm hidden sm:inline">
                    Informasi Dasar
                  </span>
                </button>
                <div className="w-4 md:w-8 h-px bg-gray-300"></div>
                <button 
                  onClick={() => isDirty ? handleSaveAndContinue() : setCurrentStep(2)}
                  disabled={!isEditing && !formData.title}
                  className={`px-3 md:px-4 py-2 rounded-full flex items-center space-x-2 ${currentStep === 2 ? 'bg-[#FFF8E7] text-[#C5A059] border border-[#C5A059]' : 'text-gray-400'}`}
                >
                  <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">
                    2
                  </span>
                  <span className="font-semibold text-xs md:text-sm hidden sm:inline">
                    Kurikulum
                  </span>
                </button>
                <div className="w-4 md:w-8 h-px bg-gray-300"></div>
                <button 
                  onClick={() => isDirty ? handleSaveAndContinue() : setCurrentStep(3)}
                  disabled={!isEditing && !formData.title}
                  className={`px-3 md:px-4 py-2 rounded-full flex items-center space-x-2 ${currentStep === 3 ? 'bg-[#FFF8E7] text-[#C5A059] border border-[#C5A059]' : 'text-gray-400'}`}
                >
                  <span className="w-6 h-6 rounded-full bg-current text-white flex items-center justify-center text-xs">
                    3
                  </span>
                  <span className="font-semibold text-xs md:text-sm hidden sm:inline">
                    Enrollment
                  </span>
                </button>
              </div>
            </div>
            
            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
              {currentStep === 1 && (
                <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Judul Kursus
                    </label>
                    <input 
                      type="text" 
                      value={formData.title} 
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 text-sm md:text-base"
                      placeholder="Contoh: SOP Pelayanan Jamaah"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Kategori
                    </label>
                    <select 
                      value={formData.categoryId} 
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black bg-white text-sm md:text-base"
                      disabled={isLoading}
                    >
                      <option value="">Pilih Kategori</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Level
                    </label>
                    <select 
                      value={formData.level} 
                      onChange={e => setFormData({...formData, level: e.target.value as any})}
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black bg-white text-sm md:text-base"
                      disabled={isLoading}
                    >
                      <option value="basic">Basic</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea 
                      rows={4} 
                      value={formData.description} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 text-sm md:text-base"
                      placeholder="Jelaskan tentang kursus ini..."
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Cover Image & Thumbnail
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-gray-500">Cover Image</span>
                        <FileUploader 
                          folder="course-covers" 
                          accept="image/*" 
                          label="Upload Cover" 
                          onUploadSuccess={(url) => setFormData({...formData, coverImage: url, thumbnail: formData.thumbnail || url})} 
                        />
                        <input 
                          type="text" 
                          value={formData.coverImage} 
                          onChange={e => setFormData({...formData, coverImage: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg text-xs outline-none text-black"
                          placeholder="Atau masukkan URL Cover..."
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-xs font-medium text-gray-500">Thumbnail</span>
                        <FileUploader 
                          folder="course-thumbnails" 
                          accept="image/*" 
                          label="Upload Thumbnail" 
                          onUploadSuccess={(url) => setFormData({...formData, thumbnail: url})} 
                        />
                        <input 
                          type="text" 
                          value={formData.thumbnail} 
                          onChange={e => setFormData({...formData, thumbnail: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg text-xs outline-none text-black"
                          placeholder="Atau masukkan URL Thumbnail..."
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {(formData.thumbnail || formData.coverImage) && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Preview Visual
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        {formData.coverImage && (
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Cover</p>
                            <img 
                              src={formData.coverImage} 
                              alt="Cover Preview" 
                              className="w-full h-32 object-cover rounded-lg border" 
                            />
                          </div>
                        )}
                        {formData.thumbnail && (
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Thumbnail</p>
                            <img 
                              src={formData.thumbnail} 
                              alt="Thumbnail Preview" 
                              className="w-1/2 h-32 object-cover rounded-lg border mx-auto" 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Status
                    </label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="radio" 
                          checked={formData.status === 'draft'} 
                          onChange={() => setFormData({...formData, status: 'draft'})}
                          className="text-[#C5A059]" 
                          disabled={isLoading}
                        />
                        <span className="text-black text-sm md:text-base">Draft</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input 
                          type="radio" 
                          checked={formData.status === 'active'} 
                          onChange={() => setFormData({...formData, status: 'active'})}
                          className="text-[#C5A059]" 
                          disabled={isLoading}
                        />
                        <span className="text-black text-sm md:text-base">Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="max-w-4xl mx-auto space-y-4">
                  {formData.sections?.map((section, sIndex) => (
                    <div key={section.id} className="bg-white border rounded-xl shadow-sm overflow-hidden">
                      <div className="bg-gray-50 p-3 md:p-4 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2 md:gap-3 flex-1">
                          <span className="font-bold text-gray-500 text-xs md:text-sm">
                            BAB {sIndex + 1}
                          </span>
                          <input 
                            type="text" 
                            value={section.title} 
                            onChange={(e) => updateSectionTitle(sIndex, e.target.value)}
                            className="bg-transparent border-b border-dashed border-gray-400 focus:border-[#C5A059] outline-none font-semibold text-black flex-1 placeholder:text-gray-400 text-sm md:text-base"
                            placeholder="Judul Bab"
                            disabled={isLoading}
                          />
                        </div>
                        <button 
                          onClick={() => deleteSection(sIndex)}
                          disabled={isLoading}
                          className="text-red-500 hover:bg-red-50 p-1.5 md:p-2 rounded"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <div className="p-3 md:p-4 space-y-2 md:space-y-3">
                        {section.lessons.map((lesson) => (
                          <div key={lesson.id} className="flex items-center p-2 md:p-3 bg-gray-100 rounded border group">
                                                          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center rounded mr-2 md:mr-3 shrink-0">
                                                          {['youtube', 'bunny', 'vdocipher', 'video-upload'].includes(lesson.contentType) ? <Youtube size={16} /> : lesson.contentType === 'image-upload' ? <ImageIcon size={16} /> : <BookText size={16} />}
                                                        </div>
                                                        <div className="flex-1">
                                                          <h4 className="font-bold text-black text-xs md:text-sm">
                                                            {lesson.title}
                                                          </h4>
                                                          <div className="text-xs text-gray-500 flex gap-1 md:gap-2 mt-0.5">
                                                            <span>{lesson.duration || 'N/A'} menit</span> 
                                                            • 
                                                            <span className="capitalize">{lesson.contentType}</span>
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <button 
                                                            onClick={() => handleStartEditLesson(lesson, section.id)}
                                                            disabled={isLoading}
                                                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                          >
                                                            <Edit size={14} />
                                                          </button>
                                                          <button 
                                                            onClick={() => handleDeleteLesson(lesson.id, section.id)}
                                                            disabled={isLoading}
                                                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                          >
                                                            <Trash2 size={14} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    ))}
                                                    
                                                    {activeSectionId === section.id ? (
                                                      <div className="border-2 border-dashed border-[#C5A059] rounded-lg p-3 md:p-4 bg-[#FFF8E7]/30 mt-3">
                                                        <h4 className="font-bold text-gray-800 mb-2 md:mb-3 text-sm">
                                                          {editingLessonId ? 'Edit Materi' : 'Tambah Materi'}
                                                        </h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mb-2 md:mb-3">
                                                          <input 
                                                            type="text" 
                                                            placeholder="Judul Materi" 
                                                            className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 text-sm"
                                                            value={tempLesson.title} 
                                                            onChange={e => setTempLesson({...tempLesson, title: e.target.value})}
                                                            disabled={isLoading}
                                                          />
                                                          <select 
                                                            className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black bg-white text-sm"
                                                            value={tempLesson.contentType} 
                                                            onChange={e => setTempLesson({...tempLesson, contentType: e.target.value as any, url: '', textContent: ''})}
                                                            disabled={isLoading}
                                                          >
                                                            <option value="video-upload">Upload Video</option>
                                                            <option value="youtube">Link Youtube</option>
                                                            <option value="bunny">Link Bunny</option>
                                                            <option value="vdocipher">VdoCipher</option>
                                                            <option value="text">Artikel Teks</option>
                                                            <option value="image-upload">Upload Gambar</option>
                                                            <option value="file-upload">Upload File (PDF/Word/Lainnya)</option>
                                                          </select>
                                                                                                                  </div>
                                                                                                                
                                                                                                                {(tempLesson.contentType === 'video-upload' || tempLesson.contentType === 'image-upload' || tempLesson.contentType === 'file-upload') && (
                                                                                                                  <div className="mb-2 md:mb-3 space-y-3">
                                                                                                                    <input 
                                                                                                                      type="text" 
                                                                                                                      placeholder="Durasi (menit) - Opsional" 
                                                                                                                      className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 text-sm"
                                                                                                                      value={tempLesson.duration} 
                                                                                                                      onChange={e => setTempLesson({...tempLesson, duration: e.target.value})}
                                                                                                                      disabled={isLoading}
                                                                                                                    />
                                                                                                                    <FileUploader 
                                                                                                                      folder={tempLesson.contentType === 'video-upload' ? 'videos' : tempLesson.contentType === 'image-upload' ? 'images' : 'files'}
                                                                                                                      accept={tempLesson.contentType === 'video-upload' ? 'video/*' : tempLesson.contentType === 'image-upload' ? 'image/*' : '*/*'}
                                                                                                                      label={`Upload ${tempLesson.contentType === 'video-upload' ? 'Video' : tempLesson.contentType === 'image-upload' ? 'Gambar' : 'File'}`}
                                                                                                                      onUploadSuccess={(url) => setTempLesson(prev => ({ ...prev, url }))}
                                                                                                                    />
                                                                                                                    {tempLesson.url && (
                                                                                                                      <div className="p-2 bg-green-50 rounded-lg border border-green-200">
                                                                                                                        <p className="text-xs text-green-700 font-medium">Berhasil diunggah!</p>
                                                                                                                        <p className="text-[10px] text-gray-500 truncate mt-1">{tempLesson.url}</p>
                                                                                                                      </div>
                                                                                                                    )}
                                                                                                                  </div>
                                                                                                                )}
                                                        
                                                        {(tempLesson.contentType === 'youtube' || tempLesson.contentType === 'bunny' || tempLesson.contentType === 'vdocipher') && (
                                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mb-2 md:mb-3">
                                                            <input 
                                                              type="text" 
                                                              placeholder="Durasi (menit)" 
                                                              className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 text-sm"
                                                              value={tempLesson.duration} 
                                                              onChange={e => setTempLesson({...tempLesson, duration: e.target.value})}
                                                              disabled={isLoading}
                                                            />
                                                            <input 
                                                              type="text" 
                                                              placeholder={
                                                                tempLesson.contentType === 'youtube' ? "URL Youtube" :
                                                                tempLesson.contentType === 'bunny' ? "Bunny Video ID" :
                                                                "VdoCipher Video ID"
                                                              }
                                                              className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 text-sm"
                                                              value={tempLesson.url} 
                                                              onChange={e => setTempLesson({...tempLesson, url: e.target.value})}
                                                              onBlur={e => {
                                                                if (tempLesson.contentType === 'youtube') {
                                                                  const videoId = getYouTubeId(e.target.value);
                                                                  if (videoId && !formData.coverImage) {
                                                                    setFormData({...formData, thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`});
                                                                  }
                                                                }
                                                              }}
                                                              disabled={isLoading}
                                                            />
                                                          </div>
                                                        )}
                                                        
                                                        {tempLesson.contentType === 'text' && (
                                                          <div className="mb-2 md:mb-3">
                                                            <RichTextEditor
                                                              initialValue={tempLesson.textContent}
                                                              onChange={handleRichTextChange}
                                                              placeholder="Tulis artikel di sini..."
                                                              showSaveButton={false}
                                                            />
                                                          </div>
                                                        )}
                            
                            <div className="my-2 md:my-3 space-y-2 border-t pt-3 mt-4">
                              <label className="text-xs font-bold text-gray-600 block">
                                Lampiran / File Pendukung (PDF, Word, dll)
                              </label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <input 
                                    placeholder="Nama File Lampiran" 
                                    className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 w-full text-xs md:text-sm"
                                    value={tempLesson.attachmentName || ''} 
                                    onChange={e => setTempLesson(prev => ({...prev, attachmentName: e.target.value}))}
                                    disabled={isLoading}
                                  />
                                  <input 
                                    placeholder="URL File (Drive, Docs, dll)" 
                                    className="px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 w-full text-xs md:text-sm"
                                    value={tempLesson.attachmentUrl || ''} 
                                    onChange={e => setTempLesson(prev => ({...prev, attachmentUrl: e.target.value}))}
                                    disabled={isLoading}
                                  />
                                </div>
                                <div>
                                  <FileUploader 
                                    folder="attachments" 
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt" 
                                    label="Upload File Lampiran"
                                    onUploadSuccess={(url, name) => setTempLesson(prev => ({...prev, attachmentUrl: url, attachmentName: prev.attachmentName || name}))} 
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-2 justify-end">
                              <button 
                                onClick={handleCancelEditLesson}
                                disabled={isLoading}
                                className="w-full md:w-auto px-3 py-1.5 text-xs text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 font-semibold"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={() => handleSaveLesson(section.id)}
                                disabled={isLoading}
                                className="w-full md:w-auto px-3 py-1.5 text-xs bg-[#C5A059] text-black rounded font-bold hover:bg-[#B08F4A]"
                              >
                                {editingLessonId ? 'Update Materi' : 'Simpan Materi'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setActiveSectionId(section.id)}
                            disabled={isLoading}
                            className="w-full py-2 border border-dashed border-gray-300 text-gray-600 rounded hover:border-[#C5A059] hover:text-[#C5A059] text-xs flex items-center justify-center transition-colors font-semibold"
                          >
                            <Plus size={14} className="mr-1" /> Tambah Materi
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={addSection}
                    disabled={isLoading}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold border border-dashed border-gray-300 flex items-center justify-center text-sm"
                  >
                    <Plus size={16} className="mr-2" /> Tambah Bab Baru
                  </button>
                </div>
              )}

              {currentStep === 3 && (
                <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
                  {/* Enroll Users */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enroll User(s)
                    </label>
                    <input
                      type="text"
                      placeholder="Cari pengguna..."
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 text-sm"
                      value={searchTermUsers}
                      onChange={(e) => setSearchTermUsers(e.target.value)}
                    />
                    <div className="border rounded-lg h-40 md:h-48 overflow-y-auto p-2 bg-gray-50 space-y-2 mt-2">
                      {allUsers
                        .filter(user =>
                          user.name.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTermUsers.toLowerCase())
                        )
                        .map((user) => {
                          const isEnrolled = formData.enrolledUserIds?.includes(user.id) ?? false;
                          return (
                            <label 
                              key={user.id} 
                              className={`flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg cursor-pointer border transition-all text-sm ${
                                isEnrolled 
                                  ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                  : 'bg-white border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isEnrolled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const userId = user.id;
                                  setFormData(prev => ({
                                    ...prev,
                                    enrolledUserIds: checked
                                      ? [...(prev.enrolledUserIds || []), userId]
                                      : (prev.enrolledUserIds || []).filter(id => id !== userId),
                                  }));
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-[#C5A059] focus:ring-2 focus:ring-offset-0 focus:ring-[#C5A059]/50"
                              />
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-brand-gold to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <span className="text-xs md:text-sm font-semibold text-black">
                                    {user.name}
                                  </span>
                                  <p className="text-xs text-gray-500 truncate max-w-[150px] md:max-w-none">
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>

                  {/* Enroll Divisions */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Enroll Division(s)
                    </label>
                    <input
                      type="text"
                      placeholder="Cari divisi..."
                      className="w-full px-3 md:px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#C5A059] outline-none text-black placeholder:text-gray-400 text-sm"
                      value={searchTermDivisions}
                      onChange={(e) => setSearchTermDivisions(e.target.value)}
                    />
                    <div className="border rounded-lg h-40 md:h-48 overflow-y-auto p-2 bg-gray-50 space-y-2 mt-2">
                      {allDivisions
                        .filter(division =>
                          division.name.toLowerCase().includes(searchTermDivisions.toLowerCase())
                        )
                        .map((division) => {
                          const isEnrolled = formData.enrolledDivisionIds?.includes(division.id) ?? false;
                          return (
                            <label 
                              key={division.id} 
                              className={`flex items-center space-x-2 md:space-x-3 p-2 md:p-3 rounded-lg cursor-pointer border transition-all text-sm ${
                                isEnrolled 
                                  ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                  : 'bg-white border-gray-200 hover:bg-gray-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isEnrolled}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  const divisionId = division.id;
                                  setFormData(prev => ({
                                    ...prev,
                                    enrolledDivisionIds: checked
                                      ? [...(prev.enrolledDivisionIds || []), divisionId]
                                      : (prev.enrolledDivisionIds || []).filter(id => id !== divisionId),
                                  }));
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-[#C5A059] focus:ring-2 focus:ring-offset-0 focus:ring-[#C5A059]/50"
                              />
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600">
                                  <Users size={14} />
                                </div>
                                <span className="text-xs md:text-sm font-semibold text-black">
                                  {division.name}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 md:p-6 border-t flex flex-col-reverse md:flex-row md:justify-end md:space-x-3 gap-3 bg-white rounded-b-xl">
              {currentStep > 1 && (
                <button 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={isLoading}
                  className="w-full md:w-auto px-4 md:px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm"
                >
                  Kembali
                </button>
              )}
              
              {currentStep < 3 ? (
                isDirty ? (
                  <button 
                    onClick={handleSaveAndContinue}
                    disabled={isLoading}
                    className="w-full md:w-auto px-4 md:px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold flex items-center justify-center shadow-md text-sm"
                  >
                    {isLoading ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Save size={16} className="mr-2" />
                    )}
                    {isLoading ? 'Menyimpan...' : 'Simpan & Lanjut'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={isLoading}
                    className="w-full md:w-auto px-4 md:px-6 py-2.5 bg-[#C5A059] text-black rounded-lg hover:bg-[#B08F4A] font-bold text-sm"
                  >
                    Lanjut
                  </button>
                )
              ) : (
                <button 
                  onClick={handleSaveCourse}
                  disabled={isLoading || (!isDirty && isEditing)}
                  className="w-full md:w-auto px-4 md:px-6 py-2.5 bg-[#C5A059] text-black rounded-lg hover:bg-[#B08F4A] font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Save size={16} className="mr-2" />
                  )}
                  {isLoading ? 'Menyimpan...' : 'Simpan Kursus'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewData && (
        <CoursePreviewModal 
          previewData={previewData} 
          onClose={() => setShowPreview(false)} 
        />
      )}
    </div>
  );
};

export default CourseManagement;