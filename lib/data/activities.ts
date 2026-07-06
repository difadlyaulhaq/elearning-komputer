import { adminDb } from '@/lib/firebase/admin';
import { Course, User } from '@/types';

function formatTimeAgo(date: Date): string {
    if (!date || !(date instanceof Date)) return '';
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 0) return "Baru saja";

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " tahun lalu";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " bulan lalu";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " hari lalu";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " jam lalu";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " menit lalu";
    return "Baru saja";
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  time: string;
  timestamp: Date;
}

// Firestore Timestamps can be either Date objects or Firestore Timestamp objects.
// This function safely converts them to Date objects.
function toDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    // Handle string dates, although Firestore typically doesn't return them
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;
    return null;
}

export async function getRecentActivities(limit = 10): Promise<Activity[]> {
  const activities: Activity[] = [];
  const activityIds = new Set<string>();

  // 1. Get recently created courses
  try {
    const coursesSnapshot = await adminDb.collection('courses')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    for (const doc of coursesSnapshot.docs) {
      const course = doc.data() as Course;
      const createdAtDate = toDate(course.createdAt);
      if (createdAtDate) {
        const activity: Activity = {
          id: `course-${doc.id}`,
          user: 'Admin', // Assuming admin creates courses
          action: `membuat kursus baru: "${course.title}"`,
          time: formatTimeAgo(createdAtDate),
          timestamp: createdAtDate,
        };
        if (!activityIds.has(activity.id)) {
            activities.push(activity);
            activityIds.add(activity.id);
        }
      }
    }
  } catch (error) {
    console.error("Error fetching new courses for activity feed:", error);
  }

  // 2. Get recently completed courses
  // IMPORTANT: This query requires a composite index in Firestore.
  // The build log should contain a link to create it. If you see errors, please create the index.
  try {
    let courseProgressSnapshot;
    try {
      courseProgressSnapshot = await adminDb.collectionGroup('courses')
        .where('status', '==', 'completed')
        .orderBy('completedAt', 'desc')
        .limit(limit)
        .get();
    } catch (indexError: any) {
      console.warn("Firestore index missing for collection group 'courses' completedAt order. Falling back to unordered query: ", indexError.message);
      courseProgressSnapshot = await adminDb.collectionGroup('courses')
        .where('status', '==', 'completed')
        .limit(limit)
        .get();
    }

    for (const doc of courseProgressSnapshot.docs) {
      const progress = doc.data();
      const completedAtDate = toDate(progress.completedAt);
      const userRef = doc.ref.parent.parent; 

      if (completedAtDate && userRef) {
          const [userDoc, courseDoc] = await Promise.all([
            userRef.get(),
            adminDb.collection('courses').doc(progress.courseId).get()
          ]);

          if (userDoc.exists && courseDoc.exists) {
            const user = userDoc.data() as User;
            const course = courseDoc.data() as Course;
            const activity: Activity = {
              id: `completion-${user.id}-${course.id}`,
              user: user.name || 'Seseorang',
              action: `telah menyelesaikan kursus: "${course.title}"`,
              time: formatTimeAgo(completedAtDate),
              timestamp: completedAtDate,
            };
            if (!activityIds.has(activity.id)) {
                activities.push(activity);
                activityIds.add(activity.id);
            }
          }
      }
    }
  } catch (error) {
    console.error("Error fetching course completions for activity feed:", error);
    // This error is likely due to a missing Firestore index.
    // The console should have a link to create it automatically.
  }

  // 3. Get recently created users
  try {
    const usersSnapshot = await adminDb.collection('users')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

    for (const doc of usersSnapshot.docs) {
        const user = doc.data() as User;
        const createdAtDate = toDate(user.createdAt);
        if (createdAtDate) {
            const activity: Activity = {
                id: `user-${user.id}`,
                user: user.name,
                action: `bergabung sebagai pegawai baru`,
                time: formatTimeAgo(createdAtDate),
                timestamp: createdAtDate,
            };
            if (!activityIds.has(activity.id)) {
                activities.push(activity);
                activityIds.add(activity.id);
            }
        }
    }
  } catch(error) {
      console.error("Error fetching new users for activity feed:", error);
  }

  // Sort all activities by timestamp and take the most recent ones
  const sortedActivities = activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);

  return sortedActivities;
}