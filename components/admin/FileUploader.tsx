'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, CheckCircle2, Loader2, FileIcon, ImageIcon, VideoIcon } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';

interface FileUploaderProps {
  onUploadSuccess: (url: string, fileName: string) => void;
  onIsUploadingChange?: (isUploading: boolean) => void;
  folder: string;
  accept?: string;
  label?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  onIsUploadingChange,
  folder,
  accept = "*/*",
  label = "Upload File",
}) => {
  const { authFetch } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const setUploadingState = (state: boolean) => {
    setIsUploading(state);
    if (onIsUploadingChange) onIsUploadingChange(state);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    uploadFile(file);
  };

  const handleCancel = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setUploadingState(false);
      setProgress(0);
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.error('Unggahan dibatalkan');
    }
  };

  const uploadFile = async (file: File) => {
    setUploadingState(true);
    setProgress(0);

    try {
      // 1. Fetch secure upload config from Next.js
      const configRes = await authFetch('/api/upload/config');
      if (!configRes.ok) {
        const errData = await configRes.json();
        throw new Error(errData.error || 'Gagal memuat konfigurasi upload.');
      }
      const config = await configRes.json();
      const { storageZoneName, accessKey, region, cdnHostname } = config;

      // 2. Prepare Direct Upload details
      const sanitizedFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const remotePath = `${folder}/${sanitizedFileName}`;
      const bunnyUrl = `https://${region}/${storageZoneName}/${remotePath}`;
      const cdnUrl = `https://${cdnHostname}/${remotePath}`;

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = (event.loaded / event.total) * 100;
          setProgress(Math.round(percent));
        }
      });

      // Handle completed request
      xhr.addEventListener('load', () => {
        setUploadingState(false);
        xhrRef.current = null;
        
        if (xhr.status >= 200 && xhr.status < 300) {
          onUploadSuccess(cdnUrl, file.name);
          toast.success('File berhasil diunggah!');
        } else {
          toast.error(`Gagal mengunggah ke Bunny Storage: Status ${xhr.status}`);
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        setUploadingState(false);
        xhrRef.current = null;
        toast.error('Terjadi kesalahan jaringan saat mengunggah');
      });

      // Send PUT request directly to Bunny.net Storage
      xhr.open('PUT', bunnyUrl);
      xhr.setRequestHeader('AccessKey', accessKey);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.send(file);

    } catch (error: any) {
      console.error('❌ File Direct Upload Error:', error);
      toast.error(error.message || 'Gagal memulai unggahan langsung ke Bunny.');
      setUploadingState(false);
    }
  };

  const getIcon = () => {
    if (accept.includes('image')) return <ImageIcon size={20} />;
    if (accept.includes('video')) return <VideoIcon size={20} />;
    return <FileIcon size={20} />;
  };

  return (
    <div className="w-full">
      <div 
        className={`relative border-2 border-dashed rounded-lg p-4 transition-all ${
          isUploading ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 hover:border-[#0284c7] bg-white'
        }`}
      >
        {!isUploading && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            onClick={() => {
              if (typeof window !== 'undefined') {
                (window as any).isPickingFile = true;
              }
            }}
            accept={accept}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
        )}
        
        <div className="flex flex-col items-center justify-center space-y-2">
          {isUploading ? (
            <>
              <Loader2 className="animate-spin text-[#0284c7]" size={24} />
              <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[200px]">
                <div 
                  className="bg-[#0284c7] h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="flex flex-col items-center space-y-1">
                <p className="text-xs font-medium text-gray-600">{progress}% Mengunggah...</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancel();
                  }}
                  className="mt-2 flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-full transition-colors border border-red-200"
                >
                  <X size={12} />
                  Batalkan
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 bg-gray-100 rounded-full text-gray-500">
                {getIcon()}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {fileName ? `Terpilih: ${fileName}` : `Klik atau tarik file ke sini`}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
