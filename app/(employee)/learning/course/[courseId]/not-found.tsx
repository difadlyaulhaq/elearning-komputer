import Link from 'next/link';
import { BookX, LayoutGrid } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-[#F8F9FA]">
      <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-200 max-w-lg w-full">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookX className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Materi Tidak Ditemukan</h1>
        <p className="text-gray-600 mb-8">
          Mohon maaf, kursus yang Anda cari mungkin telah dihapus atau tidak lagi tersedia.
        </p>
        <div className="flex justify-center items-center gap-4">
          <Link
            href="/learning/history"
            className="px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Kembali ke Riwayat
          </Link>
          <Link
            href="/learning/catalog"
            className="flex items-center gap-2 px-6 py-3 bg-[#0284c7] text-white font-bold rounded-lg hover:bg-amber-500 transition-colors shadow-md"
          >
            <LayoutGrid size={18} />
            Jelajahi Katalog
          </Link>
        </div>
      </div>
    </div>
  );
}
