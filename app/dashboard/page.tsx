'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiCard } from '@/components/dashboard/api-card';
import { PollingControls } from '@/components/dashboard/polling-controls';
import type { MonitorEndpoint } from '@/types';

async function fetchEndpoints(): Promise<MonitorEndpoint[]> {
  const res = await fetch('/api/endpoints', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load endpoints');
  const data = await res.json();
  return data.endpoints as MonitorEndpoint[];
}

export default function DashboardPage() {
  const [autoPolling, setAutoPolling] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: endpoints = [], isLoading, error } = useQuery({
    queryKey: ['endpoints'],
    queryFn: fetchEndpoints,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/endpoints/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete endpoint');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });

  const apiCount = endpoints.filter((e) => e.type === 'api').length;
  const dbCount = endpoints.filter((e) => e.type === 'database').length;
  const networkCount = endpoints.filter((e) => e.type === 'network').length;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Monitored services</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold">{endpoints.length}</span> endpoints
            {apiCount > 0 && <span className="ml-2">({apiCount} APIs)</span>}
            {dbCount > 0 && <span className="ml-2">({dbCount} Databases)</span>}
            {networkCount > 0 && <span className="ml-2">({networkCount} Network)</span>}
          </p>
        </div>
        <Link
          href="/dashboard/endpoints/new"
          className="rounded-md bg-[#cc0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#aa0000]"
        >
          Add endpoint
        </Link>
      </div>

      <PollingControls
        onTogglePolling={setAutoPolling}
        isPolling={autoPolling}
      />

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load endpoints'}
        </div>
      )}

      {isLoading && (
        <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Loading endpoints...
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {endpoints.map((endpoint) => (
          <ApiCard
            key={endpoint.id}
            endpoint={endpoint}
            autoPolling={autoPolling}
            onEdit={() => router.push(`/dashboard/endpoints/${encodeURIComponent(endpoint.id)}`)}
            onDelete={() => deleteMutation.mutate(endpoint.id)}
            isDeleting={deleteMutation.isPending}
          />
        ))}
      </div>

      {!isLoading && endpoints.length === 0 && (
        <div className="rounded-lg bg-white p-12 text-center shadow">
          <p className="mb-2 text-lg text-slate-700">No endpoints configured</p>
          <p className="mb-4 text-sm text-slate-500">Add an endpoint to start monitoring.</p>
          <Link
            href="/dashboard/endpoints/new"
            className="inline-flex rounded-md bg-[#cc0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#aa0000]"
          >
            Add endpoint
          </Link>
        </div>
      )}
    </>
  );
}
