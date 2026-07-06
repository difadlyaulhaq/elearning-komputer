'use client';

import DivisionManagement from '@/components/admin/DivisionManagement';

interface EditPageProps {
  params: {
    id: string;
  };
}

export default function EditDivisionPage({ params }: EditPageProps) {
  return <DivisionManagement forceAction="edit" forceId={params.id} />;
}
