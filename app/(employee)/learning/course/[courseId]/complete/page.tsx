'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle, Home } from 'lucide-react';
import { useParams } from 'next/navigation';

const CourseCompletionPage = () => {
    const params = useParams();
    const { courseId } = params;

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8F9FA] text-center p-4">
            <div className="bg-white p-10 rounded-2xl shadow-lg border max-w-lg w-full">
                <CheckCircle className="text-green-500 w-20 h-20 mx-auto mb-6" />
                <h1 className="text-3xl font-bold text-black mb-3">
                    Selamat, Anda telah menyelesaikan kursus!
                </h1>
                <p className="text-gray-600 mb-8">
                    Semua materi telah berhasil Anda rampungkan. Terus tingkatkan keahlian Anda dengan kursus lainnya.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <Link href="/learning/dashboard"
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-[#0284c7] text-white rounded-lg font-bold shadow-lg hover:bg-amber-500 transition-colors"
                    >
                        <Home size={20} />
                        Kembali ke Dashboard
                    </Link>
                    <Link href={`/learning/course/${courseId}`}
                        className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-gray-100 text-gray-800 rounded-lg font-semibold border hover:bg-gray-200 transition-colors"
                    >
                        Lihat Lagi Detail Kursus
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default CourseCompletionPage;