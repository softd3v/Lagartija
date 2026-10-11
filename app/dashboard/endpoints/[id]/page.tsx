import { EndpointEditor } from '@/components/dashboard/endpoint-editor';

export default async function EditEndpointPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EndpointEditor endpointId={decodeURIComponent(id)} />;
}
