
import { adminDb } from '@/lib/firebase/admin';
import { Course, User, Division, Progress } from '@/types';

type CourseWithProgress = Omit<Course, 'status'> & Progress;

// This function will be used by the server component for "My Courses"
export async function getMyEnrolledCourses(userId: string): Promise<CourseWithProgress[]> {
  if (!userId) return [];

  // 1. Get User's Division Name
  const userDoc = await adminDb.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    console.error(`[GET_MY_COURSES] User ${userId} not found`);
    return [];
  }
  const user = userDoc.data() as User;
  const userDivisionName = user.division;
  
  console.log(`[GET_MY_COURSES] User: ${user.name}, Division: ${userDivisionName}`);

  // 2. Find Division ID from Division Name (as enrollment is by ID)
  let divisionId: string | null = null;
  if (userDivisionName && userDivisionName !== 'Unassigned') {
    // Try exact match first
    let divisionSnapshot = await adminDb.collection('divisions').where('name', '==', userDivisionName).limit(1).get();
    
    // If not found, try to find by case-insensitive name if possible (Firestore doesn't support native case-insensitive)
    // For now, we'll stick to exact match but we log if it fails
    if (!divisionSnapshot.empty) {
      divisionId = divisionSnapshot.docs[0].id;
      console.log(`[GET_MY_COURSES] Found Division ID: ${divisionId} for ${userDivisionName}`);
    } else {
      console.warn(`[GET_MY_COURSES] No division ID found for name: "${userDivisionName}"`);
      
      // Fallback: search all and match manually (only if collection is small)
      const allDivisions = await adminDb.collection('divisions').get();
      const matchedDiv = allDivisions.docs.find(d => d.data().name?.toLowerCase() === userDivisionName.toLowerCase());
      if (matchedDiv) {
        divisionId = matchedDiv.id;
        console.log(`[GET_MY_COURSES] Found Division ID via fallback: ${divisionId}`);
      }
    }
  }

  // 3. Build queries
  const coursesRef = adminDb.collection('courses');
  
  let enrolledCourses: Course[] = [];

  if (user.role === 'admin') {
    // Admins see everything
    console.log(`[GET_MY_COURSES] Admin detected, fetching all courses...`);
    const allCoursesSnapshot = await coursesRef.get();
    enrolledCourses = allCoursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    console.log(`[GET_MY_COURSES] Admin found ${enrolledCourses.length} courses total`);
  } else {
    console.log(`[GET_MY_COURSES] Fetching for user: ${userId}, divisionId: ${divisionId}`);
    const queries = [
      coursesRef.where('enrolledUserIds', 'array-contains', userId).get(),
    ];

    if (divisionId) {
      queries.push(coursesRef.where('enrolledDivisionIds', 'array-contains', divisionId).get());
    }
    
    // 4. Execute queries and merge results
    const results = await Promise.all(queries);
    const coursesMap = new Map<string, Course>();

    results.forEach((snapshot, idx) => {
      console.log(`[GET_MY_COURSES] Query ${idx} returned ${snapshot.size} docs`);
      snapshot.forEach(doc => {
        if (!coursesMap.has(doc.id)) {
          coursesMap.set(doc.id, { id: doc.id, ...doc.data() } as Course);
        }
      });
    });
    
    enrolledCourses = Array.from(coursesMap.values());
    console.log(`[GET_MY_COURSES] Total merged courses: ${enrolledCourses.length}`);
  }

  if (enrolledCourses.length === 0) return [];

  // 5. Get progress for each enrolled course from the 'progress' root collection
  const progressPromises = enrolledCourses.map(course => 
    adminDb.collection('progress').doc(`${userId}_${course.id}`).get()
  );
  
  const progressResults = await Promise.all(progressPromises);
  const coursesWithProgress: CourseWithProgress[] = [];

  for (let i = 0; i < enrolledCourses.length; i++) {
    const course = enrolledCourses[i];
    const progressDoc = progressResults[i];
    
    let progressData: Progress;
    if (progressDoc.exists) {
      progressData = progressDoc.data() as Progress;
    } else {
      progressData = {
        userId,
        courseId: course.id,
        status: 'not-started',
        progress: 0,
        completedLessons: [],
        lastAccess: new Date(),
      };
    }

    const combinedData = {
      ...course,
      ...progressData,
    };

    // Sanitize Firestore Timestamps and JS Dates into serializable strings
    const sanitizedData = Object.fromEntries(
      Object.entries(combinedData).map(([key, value]: [string, any]) => {
        // Check for Firestore Timestamp
        if (value && typeof value.toDate === 'function') {
          return [key, value.toDate().toISOString()];
        }
        // Check for Javascript Date
        if (value instanceof Date) {
          return [key, value.toISOString()];
        }
        return [key, value];
      })
    );

    coursesWithProgress.push(sanitizedData as CourseWithProgress);
  }

  return coursesWithProgress;
}
