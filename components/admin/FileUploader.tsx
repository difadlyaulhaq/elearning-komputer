'use client';

import React, { useState, useRef } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase/config';
import { Upload, X, CheckCircle2, Loader2, FileIcon, ImageIcon, VideoIcon } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const uploadFile = (file: File) => {
    setUploadingState(true);
    setProgress(0);

    const storageRef = ref(storage, `${folder}/${Date.now()}-${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(Math.round(p));
      },
      (error) => {
        console.error("Upload error:", error);
        toast.error(`Gagal mengunggah: ${error.message}`);
        setUploadingState(false);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        onUploadSuccess(downloadURL, file.name);
        setUploadingState(false);
        toast.success('File berhasil diunggah!');
      }
    );
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
          isUploading ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300 hover:border-[#C5A059] bg-white'
        }`}
      >
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
          disabled={isUploading}
        />
        
        <div className="flex flex-col items-center justify-center space-y-2">
          {isUploading ? (
            <>
              <Loader2 className="animate-spin text-[#C5A059]" size={24} />
              <div className="w-full bg-gray-200 rounded-full h-2.5 max-w-[200px]">
                <div 
                  className="bg-[#C5A059] h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs font-medium text-gray-600">{progress}% Mengunggah...</p>
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
