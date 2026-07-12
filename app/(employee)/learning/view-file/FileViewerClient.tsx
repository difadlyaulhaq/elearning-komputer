'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Download, FileText, Loader2, RefreshCw } from 'lucide-react';

interface FileViewerClientProps {
  initialUrl: string;
  initialName: string;
}

export function FileViewerClient({ initialUrl, initialName }: FileViewerClientProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAndroid, setIsAndroid] = useState(false);
  const [origin, setOrigin] = useState('');

  // Clean and validate URL
  const fileUrl = initialUrl.trim();
  const fileName = initialName.trim() || 'Lampiran';

  // Detect file type
  const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileUrl);
  const isPdf = /\.pdf$/i.test(fileUrl);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsAndroid(/android/i.test(ua));
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  };

  const handleBack = () => {
    router.back();
  };

  const proxiedUrl = origin 
    ? `${origin}/api/learning/view-file?url=${encodeURIComponent(fileUrl)}`
    : '';

  // Optimize PDF viewing: Use direct iframe for non-Android devices, fallback to Google Docs Viewer
  const useDirectIframe = isPdf && !isAndroid;
  const googleDocsViewerUrl = proxiedUrl 
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(proxiedUrl)}&embedded=true`
    : '';
  const viewerUrl = useDirectIframe ? proxiedUrl : googleDocsViewerUrl;

  return (
    <div className="flex flex-col w-full h-screen bg-slate-950 text-slate-100 font-sans select-none">
      {/* Premium Glassmorphic Header */}
      <header 
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
        className="flex items-center justify-between px-4 pb-3 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-10"
      >
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all active:scale-95 cursor-pointer"
        >
          <ChevronLeft size={16} />
          <span>Kembali</span>
        </button>

        <h1 className="flex-1 text-center font-bold text-sm md:text-base px-4 truncate text-[#0284c7] max-w-[50%] md:max-w-[60%]">
          {fileName}
        </h1>

        <div className="flex items-center gap-2">
          {!isImage && (
            <button
              onClick={handleRefresh}
              title="Refresh Dokumen"
              className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all active:scale-95 cursor-pointer animate-none"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          )}
          <a
            href={proxiedUrl ? `${proxiedUrl}&download=true` : fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 transition-all active:scale-95 cursor-pointer"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Unduh</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center bg-slate-950">
        {!fileUrl ? (
          <div className="text-center p-6 max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-950/40 border border-red-900/50 rounded-2xl flex items-center justify-center">
              <FileText size={28} className="text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-slate-200 mb-1">Gagal Membuka File</h2>
            <p className="text-sm text-slate-400 mb-4">Link materi pendukung tidak valid atau kosong.</p>
            <button
              onClick={handleBack}
              className="w-full py-2.5 px-4 bg-[#0284c7] hover:bg-[#0369a1] text-white font-semibold rounded-xl transition-all cursor-pointer"
            >
              Kembali ke Materi
            </button>
          </div>
        ) : isImage ? (
          /* Image Viewer */
          <div className="w-full h-full p-4 flex items-center justify-center overflow-auto">
            <img
              src={fileUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-all duration-300"
              onLoad={() => setIsLoading(false)}
            />
          </div>
        ) : (
          /* Document Viewer (Direct Iframe or Google Docs Viewer iframe) */
          <div className="w-full h-full relative">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 gap-3 p-4">
                <Loader2 size={32} className="text-[#0284c7] animate-spin" />
                <p className="text-xs text-slate-400">Sedang memuat dokumen...</p>
                <p className="text-[10px] text-slate-500 max-w-[200px] text-center mt-1">
                  Jika memuat terlalu lama, Anda dapat membukanya secara langsung atau menyegarkan halaman.
                </p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700/50 transition-all active:scale-95 cursor-pointer text-center"
                >
                  Buka Langsung di Perangkat
                </a>
              </div>
            )}
            {viewerUrl && (
              <iframe
                key={`${refreshKey}-${viewerUrl}`}
                src={viewerUrl}
                className="w-full h-full border-none"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
