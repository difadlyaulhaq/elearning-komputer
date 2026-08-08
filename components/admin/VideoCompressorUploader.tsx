'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Video, X, CheckCircle2, Loader2, Sparkles, AlertCircle, Info } from 'lucide-react';
import toast from 'react-hot-toast';

import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase/config';

interface VideoCompressorUploaderProps {
  onUploadSuccess: (url: string, fileName: string, duration?: string) => void;
  onIsUploadingChange?: (isUploading: boolean) => void;
  folder: string;
}

export const VideoCompressorUploader: React.FC<VideoCompressorUploaderProps> = ({
  onUploadSuccess,
  onIsUploadingChange,
  folder,
}) => {
  const { authFetch } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [skipCompression, setSkipCompression] = useState(false);
  const [videoDuration, setVideoDuration] = useState<string>('');
  const [existingUrlInput, setExistingUrlInput] = useState('');
  const [showExistingInput, setShowExistingInput] = useState(false);

  const ffmpegRef = useRef(new FFmpeg());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const handleApplyExistingBunny = () => {
    if (!existingUrlInput.trim()) {
      toast.error('Masukkan URL atau ID Video Bunny.');
      return;
    }
    let finalUrl = existingUrlInput.trim();
    // Jika user menginput UUID GUID (misal: 0c3a728a-c08b-4efb-96a0-5f8d5199b270)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(finalUrl)) {
      const libraryId = process.env.NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID || '701408';
      finalUrl = `bunny-stream://${libraryId}/${finalUrl}`;
    } else if (!finalUrl.startsWith('bunny-stream://') && !finalUrl.startsWith('http')) {
      const parts = finalUrl.split('/');
      if (parts.length === 2) {
        finalUrl = `bunny-stream://${finalUrl}`;
      }
    }
    onUploadSuccess(finalUrl, 'Video Bunny CDN', videoDuration);
    toast.success('Video Bunny berhasil dihubungkan ke materi!');
  };

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    try {
      const isMultiThreadSupported = typeof SharedArrayBuffer !== 'undefined';
      const ffmpeg = ffmpegRef.current;
      
      if (isMultiThreadSupported) {
        console.log('⚡ Loading multi-threaded FFmpeg.wasm...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        });
      } else {
        console.log('🐢 SharedArrayBuffer not supported. Loading single-threaded FFmpeg.wasm...');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }
      
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading FFmpeg:', error);
      toast.error('Gagal memuat sistem kompresi video.');
    }
  };

  const setGlobalUploadingState = (state: boolean) => {
    if (onIsUploadingChange) onIsUploadingChange(state);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast.error('File harus berupa video.');
      return;
    }

    setFileName(file.name);
    setOriginalSize(file.size);
    setVideoDuration(''); // Reset duration state

    // Dapatkan durasi video secara otomatis dari metadata file
    try {
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.src = URL.createObjectURL(file);
      videoElement.onloadedmetadata = () => {
        URL.revokeObjectURL(videoElement.src);
        const durationSeconds = videoElement.duration;
        if (!isNaN(durationSeconds)) {
          // Hitung durasi dalam menit, minimal 1 menit
          const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
          setVideoDuration(durationMinutes.toString());
        }
      };
    } catch (err) {
      console.error('Gagal membaca metadata durasi video:', err);
    }
    
    if (skipCompression) {
      setGlobalUploadingState(true);
      uploadToServer(file, file.name);
    } else {
      processAndUpload(file);
    }
  };

  const processAndUpload = async (file: File) => {
    setGlobalUploadingState(true);
    
    try {
      // 1. Ensure FFmpeg is loaded
      if (!isLoaded) {
        setIsCompressing(true); // Use compressing state to show we are working
        await loadFFmpeg();
      }

      setIsCompressing(true);
      setCompressionProgress(0);

      const ffmpeg = ffmpegRef.current;
      const inputName = 'input.mp4';
      const outputName = 'output.mp4';
      
      // 2. Write file to MEMFS
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Listen to progress
      ffmpeg.on('progress', ({ progress }) => {
        setCompressionProgress(Math.round(progress * 100));
      });

      // 3. Compress and optimize (+faststart)
      // Batasi resolusi lebar maksimal ke 1080p (1920px) secara proporsional agar video tidak terlalu berat saat distreaming
      await ffmpeg.exec([
        '-i', inputName,
        '-vf', "scale='min(1920,iw)':-2",
        '-vcodec', 'libx264',
        '-crf', '28',
        '-preset', 'ultrafast', // Changed from superfast to ultrafast for faster browser-side processing
        '-acodec', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputName
      ]);

      // 4. Read result
      const data = await ffmpeg.readFile(outputName);
      const compressedBlob = new Blob([data as any], { type: 'video/mp4' });
      setCompressedSize(compressedBlob.size);

      setIsCompressing(false);
      uploadToServer(compressedBlob, file.name);

    } catch (error) {
      console.error('Compression error:', error);
      toast.error('Kompresi gagal. Menggunakan file asli...');
      setIsCompressing(false);
      uploadToServer(file, file.name);
    }
  };

  const uploadToServer = async (fileBlob: Blob | File, originalName: string) => {
    setIsUploading(true);
    setProgress(0);

    try {
      // 1. Force refresh Firebase ID Token to prevent expiration during long upload/compression
      const token = await auth.currentUser?.getIdToken(true);

      // 2. Fetch secure video creation config from Next.js
      const configRes = await authFetch('/api/video/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ title: originalName }),
      });
      if (!configRes.ok) {
        const errData = await configRes.json();
        throw new Error(errData.error || 'Gagal membuat video placeholder di Bunny Stream.');
      }
      const config = await configRes.json();
      const { videoId, libraryId } = config;

      // 3. Prepare Direct Upload details for Bunny Stream
      const bunnyStreamUrl = `bunny-stream://${libraryId}/${videoId}`;

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
        setIsUploading(false);
        setGlobalUploadingState(false);
        xhrRef.current = null;
        
        if (xhr.status >= 200 && xhr.status < 300) {
          onUploadSuccess(bunnyStreamUrl, originalName, videoDuration);
          toast.success('Video berhasil dioptimasi & diunggah ke Bunny Stream!');
        } else {
          toast.error(`Gagal mengunggah ke Bunny Stream: Status ${xhr.status}`);
        }
      });

      // Handle network errors
      xhr.addEventListener('error', () => {
        setIsUploading(false);
        setGlobalUploadingState(false);
        xhrRef.current = null;
        toast.error('Terjadi kesalahan jaringan saat mengunggah');
      });

      // Send PUT request directly as binary stream to server video upload proxy
      xhr.open('PUT', `/api/video/upload?videoId=${encodeURIComponent(videoId)}`);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      
      const freshToken = await auth.currentUser?.getIdToken(true);
      if (freshToken) {
        xhr.setRequestHeader('Authorization', `Bearer ${freshToken}`);
      }

      xhr.send(fileBlob);

    } catch (error: any) {
      console.error('❌ Direct Bunny Stream Upload Error:', error);
      toast.error(error.message || 'Gagal memulai unggahan langsung ke Bunny Stream.');
      setIsUploading(false);
      setGlobalUploadingState(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCancel = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
    }
    setIsCompressing(false);
    setIsUploading(false);
    setGlobalUploadingState(false);
    setFileName(null);
    toast.error('Proses dibatalkan');
  };

  return (
    <div className="w-full space-y-3">
      <div 
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${
          (isCompressing || isUploading) ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 hover:border-[#0284c7] bg-white'
        }`}
      >
        {!(isCompressing || isUploading) && (
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        )}
        
        <div className="flex flex-col items-center justify-center text-center">
          {isCompressing ? (
            <div className="space-y-4 w-full max-w-xs">
              <div className="flex justify-center">
                <div className="relative">
                  <Video className="text-[#0284c7] animate-pulse" size={32} />
                  <Sparkles className="absolute -top-1 -right-1 text-yellow-500 animate-bounce" size={14} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-sm font-bold text-gray-800">Mengompresi Video...</p>
                  <p className="text-xs font-mono text-[#0284c7]">{compressionProgress}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-[#0284c7] to-yellow-400 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${compressionProgress}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1 italic">
                  <Info size={10} /> Jangan tutup tab ini selama proses berlangsung
                </p>
              </div>
            </div>
          ) : isUploading ? (
            <div className="space-y-4 w-full max-w-xs">
              <div className="flex justify-center">
                <Loader2 className="animate-spin text-[#0284c7]" size={32} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-sm font-bold text-gray-800">Mengunggah...</p>
                  <p className="text-xs font-mono text-[#0284c7]">{progress}%</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#0284c7] h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                {compressedSize > 0 && (
                  <p className="text-[10px] text-green-600 font-medium text-center">
                    Berhasil dikompres: {formatSize(originalSize)} → {formatSize(compressedSize)}
                  </p>
                )}
              </div>
              <button
                onClick={handleCancel}
                className="mx-auto flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-red-600 hover:text-white hover:bg-red-500 border border-red-200 rounded-full transition-all"
              >
                <X size={14} /> Batal
              </button>
            </div>
          ) : (
            <>
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#0284c7] mb-4 shadow-inner border border-gray-100">
                <Video size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-800">Upload Video Pembelajaran</p>
                <p className="text-xs text-gray-500">
                  {fileName ? `Terpilih: ${fileName}` : `Video akan dikompresi otomatis untuk streaming lancar`}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-100 flex items-center gap-1">
                  <Sparkles size={10} /> Auto Compress
                </span>
                
              </div>
            </>
          )}
        </div>
      </div>

      {/* Option to skip compression if the video is already compressed on PC */}
      {!(isCompressing || isUploading) && (
        <div className="space-y-2">
          <label className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-150 cursor-pointer select-none hover:bg-gray-100 transition-colors">
            <input
              type="checkbox"
              checked={skipCompression}
              onChange={(e) => setSkipCompression(e.target.checked)}
              className="w-4 h-4 text-[#0066FF] border-gray-300 rounded focus:ring-[#0066FF] transition-colors"
            />
            <div className="text-left">
              <p className="text-xs font-bold text-gray-800">Lewati kompresi browser</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Centang ini jika file video Anda sudah kecil atau sudah dikompres manual di PC (Handbrake/CapCut).</p>
            </div>
          </label>

          {/* Input manual untuk Bunny Video ID / URL yang sudah ada */}
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-800">Atau Gunakan Video Bunny yang Sudah Ada</p>
              <button
                type="button"
                onClick={() => setShowExistingInput(!showExistingInput)}
                className="text-[11px] font-semibold text-[#0284c7] hover:underline"
              >
                {showExistingInput ? 'Sembunyikan' : 'Tempel ID/URL'}
              </button>
            </div>

            {showExistingInput && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Contoh: 0c3a728a-c08b-4efb... atau bunny-stream://701408/..."
                  value={existingUrlInput}
                  onChange={(e) => setExistingUrlInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs outline-none text-black bg-white focus:ring-1 focus:ring-[#0284c7]"
                />
                <button
                  type="button"
                  onClick={handleApplyExistingBunny}
                  className="px-3 py-1.5 bg-[#0284c7] text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                >
                  Gunakan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Client-side only warning for large files */}
      <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
        <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={14} />
        <p className="text-[10px] text-blue-700 leading-normal">
          Proses kompresi dilakukan langsung di browser Anda. Untuk video besar (&gt;50MB), proses mungkin memerlukan waktu beberapa menit tergantung kecepatan perangkat Anda.
        </p>
      </div>
    </div>
  );
};
