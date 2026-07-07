import DivisionForm from '@/components/admin/DivisionForm';

interface EditDivisionPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDivisionPage({ params }: EditDivisionPageProps) {
  const { id } = await params;
  return <DivisionForm id={id} />;
}
