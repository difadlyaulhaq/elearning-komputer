'use client';

import UserManagement from '@/components/admin/UserManagement';

interface EditPageProps {
  params: {
    id: string;
  };
}

export default function EditUserPage({ params }: EditPageProps) {
  return <UserManagement forceAction="edit" forceId={params.id} />;
}
