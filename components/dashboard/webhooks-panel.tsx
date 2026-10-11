'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Send, Trash2, Pencil } from 'lucide-react';
import type { AlertType, WebhookConfig, WebhookType } from '@/types';

const ALL_EVENTS: { value: AlertType; label: string }[] = [
  { value: 'down', label: 'API Down' },
  { value: 'recovered', label: 'API Recovered' },
  { value: 'database-down', label: 'Database Down' },
  { value: 'database-recovered', label: 'Database Recovered' },
];

const WEBHOOK_TYPES: { value: WebhookType; label: string }[] = [
  { value: 'discord', label: 'Discord' },
  { value: 'slack', label: 'Slack' },
  { value: 'generic', label: 'Generic JSON' },
];

type FormValues = {
  id: string;
  name: string;
  url: string;
  type: WebhookType;
  enabled: boolean;
  events: AlertType[];
  endpointIds: string;
};

const EMPTY_FORM: FormValues = {
  id: '',
  name: '',
  url: '',
  type: 'discord',
  enabled: true,
  events: ['down', 'recovered'],
  endpointIds: '',
};

async function fetchWebhooks(): Promise<WebhookConfig[]> {
  const res = await fetch('/api/webhooks', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load webhooks');
  const data = await res.json();
  return data.webhooks as WebhookConfig[];
}

function toPayload(values: FormValues): WebhookConfig {
  return {
    id: values.id.trim(),
    name: values.name.trim(),
    url: values.url.trim(),
    type: values.type,
    enabled: values.enabled,
    events: values.events,
    endpointIds: values.endpointIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
  };
}

function fromWebhook(webhook: WebhookConfig): FormValues {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    type: webhook.type,
    enabled: webhook.enabled,
    events: webhook.events,
    endpointIds: webhook.endpointIds.join(', '),
  };
}

export function WebhooksPanel() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);

  const { data: webhooks = [], isLoading, error } = useQuery({
    queryKey: ['webhooks'],
    queryFn: fetchWebhooks,
  });

  const saveMutation = useMutation({
    mutationFn: async (webhook: WebhookConfig) => {
      const isEdit = Boolean(editingId);
      const res = await fetch(isEdit ? `/api/webhooks/${editingId}` : '/api/webhooks', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhook),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save webhook');
      }
    },
    onSuccess: async () => {
      setValues(EMPTY_FORM);
      setEditingId(null);
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete webhook');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Test webhook failed');
      return data.message as string;
    },
    onSuccess: (message) => {
      setTestMessage(message);
      setTimeout(() => setTestMessage(null), 5000);
    },
    onError: (err: Error) => setTestMessage(`Error: ${err.message}`),
  });

  function toggleEvent(event: AlertType) {
    setValues((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!values.id || !values.name || !values.url) {
      setFormError('ID, name and URL are required');
      return;
    }
    if (values.events.length === 0) {
      setFormError('Select at least one event');
      return;
    }

    saveMutation.mutate(toPayload(values));
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-[#cc0000]" />
        <h2 className="text-lg font-semibold text-slate-900">Webhook Notifications</h2>
      </div>
      <p className="text-sm text-slate-600 mb-6">
        Send alerts to Discord, Slack or any HTTP endpoint when endpoints go down or recover.
      </p>

      {testMessage && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          {testMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error instanceof Error ? error.message : 'Failed to load webhooks'}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500 mb-6">Loading webhooks...</p>
      ) : webhooks.length > 0 ? (
        <div className="mb-6 space-y-3">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {webhook.name}
                  {!webhook.enabled && (
                    <span className="ml-2 text-xs text-slate-500">(disabled)</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {webhook.type} · {webhook.events.join(', ')}
                  {webhook.endpointIds.length > 0
                    ? ` · endpoints: ${webhook.endpointIds.join(', ')}`
                    : ' · all endpoints'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => testMutation.mutate(webhook.id)}
                  disabled={testMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(webhook.id);
                    setValues(fromWebhook(webhook));
                    setFormError(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(webhook.id)}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500 mb-6">No webhooks configured yet.</p>
      )}

      <form onSubmit={handleSubmit} className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">
          {editingId ? `Edit Webhook: ${editingId}` : 'Add Webhook'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm text-slate-700">
            ID
            <input
              value={values.id}
              onChange={(e) => setValues((v) => ({ ...v, id: e.target.value }))}
              disabled={Boolean(editingId)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              placeholder="discord-alerts"
            />
          </label>

          <label className="text-sm text-slate-700">
            Name
            <input
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Discord #alertas"
            />
          </label>

          <label className="text-sm text-slate-700 md:col-span-2">
            Webhook URL
            <input
              value={values.url}
              onChange={(e) => setValues((v) => ({ ...v, url: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </label>

          <label className="text-sm text-slate-700">
            Type
            <select
              value={values.type}
              onChange={(e) =>
                setValues((v) => ({ ...v, type: e.target.value as WebhookType }))
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {WEBHOOK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-700 flex items-end gap-2 pb-2">
            <input
              type="checkbox"
              checked={values.enabled}
              onChange={(e) => setValues((v) => ({ ...v, enabled: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Enabled
          </label>

          <fieldset className="text-sm text-slate-700 md:col-span-2">
            <legend className="mb-2">Events</legend>
            <div className="flex flex-wrap gap-3">
              {ALL_EVENTS.map((event) => (
                <label key={event.value} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={values.events.includes(event.value)}
                    onChange={() => toggleEvent(event.value)}
                    className="rounded border-slate-300"
                  />
                  {event.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="text-sm text-slate-700 md:col-span-2">
            Endpoint IDs (optional, comma separated — empty = all)
            <input
              value={values.endpointIds}
              onChange={(e) => setValues((v) => ({ ...v, endpointIds: e.target.value }))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="CCTAPIEA, RTG14"
            />
          </label>
        </div>

        {formError && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setValues(EMPTY_FORM);
                setFormError(null);
              }}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="rounded-md bg-[#cc0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#aa0000] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {saveMutation.isPending ? 'Saving...' : editingId ? 'Save Webhook' : 'Add Webhook'}
          </button>
        </div>
      </form>
    </div>
  );
}
