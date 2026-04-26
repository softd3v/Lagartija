'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiCard } from '@/components/dashboard/api-card';
import { PollingControls } from '@/components/dashboard/polling-controls';
import { EndpointForm } from '@/components/dashboard/endpoint-form';
import type { MonitorEndpoint } from '@/types';

async function fetchEndpoints(): Promise<MonitorEndpoint[]> {
  const res = await fetch('/api/endpoints', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load endpoints');
  const data = await res.json();
  return data.endpoints as MonitorEndpoint[];
}

export default function DashboardPage() {
  const [autoPolling, setAutoPolling] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<MonitorEndpoint | null>(null);
  const queryClient = useQueryClient();

  const { data: endpoints = [], isLoading, error } = useQuery({
    queryKey: ['endpoints'],
    queryFn: fetchEndpoints,
  });

  const createMutation = useMutation({
    mutationFn: async (endpoint: MonitorEndpoint) => {
      const res = await fetch('/api/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create endpoint');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (endpoint: MonitorEndpoint) => {
      const res = await fetch(`/api/endpoints/${editingEndpoint?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(endpoint),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update endpoint');
      }
    },
    onSuccess: async () => {
      setEditingEndpoint(null);
      await queryClient.invalidateQueries({ queryKey: ['endpoints'] });
    },
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

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900">
            Xentinel Monitor Dashboard
          </h1>
          <p className="text-slate-600 mt-2">
            Real-time monitoring of APIs and Databases
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="text-sm text-slate-600">
              Monitoring <span className="font-semibold">{endpoints.length}</span> endpoints
              {apiCount > 0 && <span className="ml-2">({apiCount} APIs)</span>}
              {dbCount > 0 && <span className="ml-2">({dbCount} Databases)</span>}
            </div>
          </div>
        </header>

        <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <EndpointForm
            submitLabel="Create Endpoint"
            onSubmit={async (endpoint) => createMutation.mutateAsync(endpoint)}
          />

          {editingEndpoint && (
            <EndpointForm
              initialValue={editingEndpoint}
              submitLabel="Save Changes"
              onCancel={() => setEditingEndpoint(null)}
              onSubmit={async (endpoint) => updateMutation.mutateAsync(endpoint)}
            />
          )}
        </div>

        {/* Polling Controls */}
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

        {/* Endpoint Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {endpoints.map((endpoint) => {
            return (
              <ApiCard
                key={endpoint.id}
                endpoint={endpoint}
                autoPolling={autoPolling}
                onEdit={() => setEditingEndpoint(endpoint)}
                onDelete={() => deleteMutation.mutate(endpoint.id)}
                isDeleting={deleteMutation.isPending}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {!isLoading && endpoints.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-slate-700 text-lg mb-2">
              No endpoints configured
            </p>
            <p className="text-slate-500 text-sm">
              Create your first endpoint using the form above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
