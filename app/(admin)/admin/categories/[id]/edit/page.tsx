import CategoryForm from '@/components/admin/CategoryForm';

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  return <CategoryForm id={id} />;
}
