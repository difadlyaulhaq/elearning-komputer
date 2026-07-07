import UserForm from '@/components/admin/UserForm';

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditUserPage({ params }: EditUserPageProps) {
  const { id } = await params;
  return <UserForm id={id} />;
}
