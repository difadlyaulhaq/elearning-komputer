export interface User {
  id: string;
  name: string;
  email: string;
  division: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  categoryName: string;
  level: 'basic' | 'intermediate' | 'advanced';
  coverImage?: string;
  thumbnail?: string;
  status: 'active' | 'draft';
  createdBy: string;
  createdAt: Date;
  sections: Section[];
  totalVideos: number;
  totalStudents: number;
  enrolledUserIds: string[];
  enrolledDivisionIds: string[];
}

export interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}


export interface Category {
  id: string;
  name: string;
}

export interface Progress {
  userId: string;
  courseId: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  lastAccess: Date;
  completedAt?: Date;
  completedLessons: string[];
  lastAccessedLessonId?: string;
}
export interface Lesson {
  id: string;
  title: string;
  contentType: 'youtube' | 'text';
  sourceType: 'embed' | 'drive';
  url: string;
  textContent: string; // Untuk tipe 'text'
  duration: string;
  watermark: boolean;
  forceComplete: boolean;
  attachmentName?: string;
  attachmentUrl?: string;
}

export interface Division {
  id: string;
  name: string;
}