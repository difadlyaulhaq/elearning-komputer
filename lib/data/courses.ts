// lib/data/courses.ts
import 'server-only'; // Ensures this module is only used on the server

import { adminDb } from '@/lib/firebase/admin';
import { Course } from '@/types';




export async function getCoursePageData(
  courseId: string
): Promise<Course | null> {
  try {
    if (!adminDb) {
      console.error(
        "[FIREBASE_GET_COURSE] Firebase Admin has not been initialized."
      );
      throw new Error("Firebase Admin has not been initialized.");
    }

    const courseRef = adminDb.collection("courses").doc(courseId);
    const courseDoc = await courseRef.get();

    if (!courseDoc.exists) {
      console.warn(
        `[FIREBASE_GET_COURSE] Course with ID "${courseId}" not found.`
      );
      return null;
    }

    const data = courseDoc.data();

    if (!data) {
      return null;
    }
    
    // Manually construct the object to ensure Timestamps are converted
    return {
      id: courseDoc.id,
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      level: data.level,
      coverImage: data.coverImage,
      thumbnail: data.thumbnail,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      sections: data.sections || [],
      totalVideos: data.totalVideos || 0,
      totalStudents: data.totalStudents || 0,
      enrolledUserIds: data.enrolledUserIds || [],
      enrolledDivisionIds: data.enrolledDivisionIds || [],
    } as Course;
  } catch (error) {
    console.error(
      `[FIREBASE_GET_COURSE_BY_ID_ERROR] Failed to fetch course ${courseId}:`,
      error
    );

    return null;
  }
}

export async function getAllCourses(): Promise<Course[]> {
    try {
        if (!adminDb) {
            console.error('[FIREBASE_GET_ALL_COURSES] Firebase Admin has not been initialized.');
            throw new Error('Firebase Admin has not been initialized.');
        }

        const coursesSnapshot = await adminDb.collection('courses').orderBy('createdAt', 'desc').get();
        
        if (coursesSnapshot.empty) {
            return [];
        }

        const courses = coursesSnapshot.docs.map(doc => {
            const data = doc.data();
            // Manually construct the object to ensure Timestamps are converted
            return {
              id: doc.id,
              title: data.title,
              description: data.description,
              categoryId: data.categoryId,
              categoryName: data.categoryName,
              level: data.level,
              coverImage: data.coverImage,
              thumbnail: data.thumbnail,
              status: data.status,
              createdBy: data.createdBy,
              createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
              sections: data.sections || [],
              totalVideos: data.totalVideos || 0,
              totalStudents: data.totalStudents || 0,
              enrolledUserIds: data.enrolledUserIds || [],
              enrolledDivisionIds: data.enrolledDivisionIds || [],
            } as Course;
        });

        return courses;

    } catch (error) {
        console.error('[FIREBASE_GET_ALL_COURSES_ERROR]', error);
        return []; // Return an empty array on error
    }
}

