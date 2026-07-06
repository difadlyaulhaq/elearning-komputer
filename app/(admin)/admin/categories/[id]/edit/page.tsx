'use client';

import CategoryManagement from '@/components/admin/CategoryManagement';

interface EditPageProps {
  params: {
    id: string;
  };
}

export default function EditCategoryPage({ params }: EditPageProps) {
  return <CategoryManagement forceAction="edit" forceId={params.id} />;
}
