
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { getMyEnrolledCourses } from '@/lib/data/my-courses';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const enrolledCourses = await getMyEnrolledCourses(user.id);
    console.log(`[MY-COURSES API] Found ${enrolledCourses.length} courses for user ${user.id}`);

    return NextResponse.json({ 
      success: true, 
      data: enrolledCourses 
    });

  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal Server Error' 
    }, { status: 500 });
  }
}
