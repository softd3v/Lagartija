'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { EndpointForm } from '@/components/dashboard/endpoint-form';
import type { MonitorEndpoint } from '@/types';

async function saveEndpoint(endpoint: MonitorEndpoint, existingId?: string) {
  const isEdit = Boolean(existingId);
  const res = await fetch(isEdit ? `/api/endpoints/${existingId}` : '/api/endpoints', {
    method: isEdit ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(endpoint),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save endpoint');
  }
}

export function EndpointEditor({ endpointId }: { endpointId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(endpointId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['endpoint', endpointId],
    enabled: isEdit,
    queryFn: async () => {
      const res = await fetch(`/api/endpoints/${endpointId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Endpoint not found');
      const body = await res.json();
      return body.endpoint as MonitorEndpoint;
    },
  });

  if (isEdit && isLoading) {
    return (
      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        Loading endpoint...
      </div>
    );
  }

  if (isEdit && (error || !data)) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error instanceof Error ? error.message : 'Endpoint not found'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <EndpointForm
        initialValue={data}
        submitLabel={isEdit ? 'Save Changes' : 'Create Endpoint'}
        onCancel={() => router.push('/dashboard')}
        onSubmit={async (endpoint) => {
          await saveEndpoint(endpoint, endpointId);
          await queryClient.invalidateQueries({ queryKey: ['endpoints'] });
          router.push('/dashboard');
        }}
      />
    </div>
  );
}
