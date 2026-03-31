// components/learning/LessonSkeleton.tsx
import React from 'react';

export function LessonSkeleton() {
  return (
    <div className="flex-1 flex flex-col bg-[#F8F9FA] min-h-screen">
      {/* Skeleton Header */}
      <header className="bg-white p-4 border-b flex items-center justify-between sticky top-0 z-10 animate-pulse">
        <div className="flex-1">
          <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
          <div className="h-7 w-64 bg-gray-200 rounded mb-1"></div>
          <div className="h-4 w-48 bg-gray-200 rounded"></div>
        </div>
      </header>

      <div className="p-4 md:p-8 flex-1">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Skeleton Player Area */}
          <div className="aspect-video bg-gray-300 rounded-xl shadow-lg animate-pulse flex items-center justify-center">
             <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
          </div>

          {/* Skeleton Attachments Section */}
          <div className="bg-white p-6 rounded-lg border animate-pulse">
            <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
            <div className="h-12 w-full bg-gray-100 rounded-lg"></div>
          </div>

          {/* Skeleton Completion Section */}
          <div className="bg-white p-6 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-pulse">
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 bg-gray-200 rounded"></div>
              <div className="h-4 w-64 bg-gray-200 rounded"></div>
            </div>
            <div className="h-11 w-full md:w-40 bg-gray-200 rounded-lg"></div>
          </div>

          {/* Skeleton Navigation */}
          <div className="flex items-center justify-between pt-2 animate-pulse">
            <div className="h-5 w-32 bg-gray-200 rounded"></div>
            <div className="h-5 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
