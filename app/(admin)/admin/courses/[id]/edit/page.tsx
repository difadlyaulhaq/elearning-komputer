import CourseManagement from '@/components/admin/CourseManagement';
import { getAllCourses } from '@/lib/data/courses';
import { getAllCategories } from '@/lib/data/categories';

export const revalidate = 0;

interface EditPageProps {
  params: {
    id: string;
  };
}

export default async function EditCoursePage({ params }: EditPageProps) {
  const courses = await getAllCourses();
  const categories = await getAllCategories();

  return (
    <CourseManagement 
      initialCourses={courses} 
      initialCategories={categories} 
      forceAction="edit" 
      forceId={params.id} 
    />
  );
}
