'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  Bold, Italic, List, ListOrdered, Link as LinkIcon,
  Heading1, Heading2, Quote, Code, Image as ImageIcon,
  Eye, Save, X, Undo, Redo, Type, Loader2
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/MarkdownRenderer';
import toast from 'react-hot-toast';

interface RichTextEditorProps {
  initialValue?: string;
  onSave?: (content: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  showSaveButton?: boolean;
  onChange?: (content: string) => void;
}

interface Tool {
  icon?: React.ElementType;
  label?: string;
  action?: () => void;
  disabled?: boolean;
  type?: 'divider';
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  initialValue = '',
  onSave,
  onCancel,
  placeholder = 'Tulis konten Anda di sini...',
  showSaveButton = true,
  onChange
}) => {
  const [content, setContent] = useState(initialValue);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<string[]>([initialValue]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Sync with initialValue when it changes
  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  // Auto-save to history
  useEffect(() => {
    const timer = setTimeout(() => {
      if (content !== history[historyIndex]) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(content);
        if (newHistory.length > 50) newHistory.shift(); // Limit history
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [content]);

  const insertMarkdown = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let newText;
    let newCursorPos;

    if (selectedText) {
      newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
      newCursorPos = start + before.length + selectedText.length + after.length;
    } else {
      newText = text.substring(0, start) + before + placeholder + after + text.substring(end);
      newCursorPos = start + before.length;
    }

    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos + placeholder.length);
    }, 0);
  };

  const insertLine = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const text = textarea.value;

    // Find start of current line
    let lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const lineEnd = text.indexOf('\n', start);
    const actualLineEnd = lineEnd === -1 ? text.length : lineEnd;

    const newText = text.substring(0, lineStart) + prefix + text.substring(lineStart);
    setContent(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 0);
  };

  const handleImageUploadClick = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const toastId = toast.loading('Mengunggah gambar ke Bunny.net...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'images');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Gagal mengunggah berkas ke server');
      }

      const data = await res.json();
      toast.success('Gambar berhasil diunggah!', { id: toastId });

      // Masukkan sintaks markdown dengan URL Bunny CDN yang baru
      insertMarkdown('![', `](${data.url})`, file.name.split('.')[0] || 'gambar');
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengunggah gambar. Memasukkan placeholder...', { id: toastId });
      // Fallback ke placeholder manual
      insertMarkdown('![', '](url)', 'alt text');
    } finally {
      setIsUploadingImage(false);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      setIsUploadingImage(true);
      const toastId = toast.loading('Mengunggah gambar yang di-drop...');
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'images');

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error();
        const data = await res.json();
        toast.success('Gambar berhasil diunggah!', { id: toastId });
        insertMarkdown('![', `](${data.url})`, file.name.split('.')[0] || 'gambar');
      } catch (err) {
        toast.error('Gagal mengunggah gambar yang di-drop', { id: toastId });
      } finally {
        setIsUploadingImage(false);
      }
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setContent(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setContent(history[historyIndex + 1]);
    }
  };

  const handleSave = () => {
    if (onSave) onSave(content);
  };

  const tools: Tool[] = [
    { icon: Undo, label: 'Undo (Ctrl+Z)', action: undo, disabled: historyIndex === 0 },
    { icon: Redo, label: 'Redo (Ctrl+Y)', action: redo, disabled: historyIndex === history.length - 1 },
    { type: 'divider' },
    { icon: Heading1, label: 'Heading 1', action: () => insertLine('# ') },
    { icon: Heading2, label: 'Heading 2', action: () => insertLine('## ') },
    { icon: Type, label: 'Heading 3', action: () => insertLine('### ') },
    { type: 'divider' },
    { icon: Bold, label: 'Bold (Ctrl+B)', action: () => insertMarkdown('**', '**', 'teks tebal') },
    { icon: Italic, label: 'Italic (Ctrl+I)', action: () => insertMarkdown('*', '*', 'teks miring') },
    { type: 'divider' },
    { icon: List, label: 'Bullet List', action: () => insertLine('- ') },
    { icon: ListOrdered, label: 'Numbered List', action: () => insertLine('1. ') },
    { type: 'divider' },
    { icon: LinkIcon, label: 'Link', action: () => insertMarkdown('[', '](url)', 'teks link') },
    { icon: ImageIcon, label: 'Image (Unggah Gambar)', action: handleImageUploadClick, disabled: isUploadingImage },
    { icon: Code, label: 'Inline Code', action: () => insertMarkdown('`', '`', 'code') },
    { icon: Quote, label: 'Quote', action: () => insertLine('> ') },
  ];

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b') {
          e.preventDefault();
          insertMarkdown('**', '**', 'teks tebal');
        } else if (e.key === 'i') {
          e.preventDefault();
          insertMarkdown('*', '*', 'teks miring');
        } else if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 flex items-center justify-between gap-2 flex-wrap bg-gray-50">
        <div className="flex items-center gap-1 flex-wrap">
          {tools.map((tool, index) => 
            tool.type === 'divider' ? (
              <div key={index} className="w-px h-6 bg-gray-300 mx-1" />
            ) : tool.icon ? ( // Add a check for tool.icon here
              <button
                key={index}
                onClick={tool.action}
                disabled={tool.disabled}
                title={tool.label}
                className="p-2 rounded hover:bg-gray-200 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <tool.icon size={18} />
              </button>
            ) : null // Render null if tool.icon is undefined and not a divider
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${showPreview 
              ? 'bg-[#C5A059] text-white' 
              : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Eye size={16} />
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <X size={16} />
              Batal
            </button>
          )}
          
          {showSaveButton && onSave && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#C5A059] text-white rounded-lg hover:bg-[#B08F4A] font-semibold"
            >
              <Save size={16} />
              Simpan
            </button>
          )}
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="flex-1 overflow-auto relative">
        <input 
          type="file" 
          ref={imageInputRef} 
          onChange={handleImageFileChange} 
          accept="image/*" 
          style={{ display: 'none' }}
          disabled={isUploadingImage}
        />
        {!showPreview ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (onChange) onChange(e.target.value);
            }}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            placeholder={placeholder}
            className="w-full h-full p-6 text-black text-base leading-relaxed focus:outline-none resize-none"
            style={{ minHeight: '400px' }}
            disabled={isUploadingImage}
          />
        ) : (
          <div className="p-4">
            <MarkdownRenderer
              content={content || '*Tidak ada konten untuk ditampilkan*'}
              className="prose prose-sm max-w-none"
            />
          </div>
        )}
        {isUploadingImage && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-[#C5A059]" size={28} />
              <p className="text-sm font-semibold text-gray-700">Mengunggah gambar...</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500 bg-gray-50 flex justify-between items-center">
        <div>
          Markdown Editor • Gunakan toolbar atau keyboard shortcuts
        </div>
        <div>
          {content.length} karakter • {content.split(/\s+/).filter(w => w).length} kata
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;