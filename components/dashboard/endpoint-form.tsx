'use client';

import { useEffect, useState } from 'react';
import type { MonitorEndpoint } from '@/types';

type EndpointFormValues = {
  id: string;
  type: 'api' | 'database';
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  expectedStatus: number;
  host: string;
  port: number;
  serviceName: string;
  interval: number;
  timeout: number;
  enabled: boolean;
  tags: string;
};

interface EndpointFormProps {
  initialValue?: MonitorEndpoint | null;
  onCancel?: () => void;
  onSubmit: (endpoint: MonitorEndpoint) => Promise<void>;
  submitLabel: string;
}

const EMPTY_FORM: EndpointFormValues = {
  id: '',
  type: 'api',
  name: '',
  url: '',
  method: 'GET',
  expectedStatus: 200,
  host: '',
  port: 1521,
  serviceName: '',
  interval: 30,
  timeout: 5000,
  enabled: true,
  tags: '',
};

export function EndpointForm({
  initialValue,
  onCancel,
  onSubmit,
  submitLabel,
}: EndpointFormProps) {
  const [values, setValues] = useState<EndpointFormValues>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialValue) {
      setValues(EMPTY_FORM);
      return;
    }

    if (initialValue.type === 'database') {
      setValues({
        id: initialValue.id,
        type: 'database',
        name: initialValue.name,
        url: '',
        method: 'GET',
        expectedStatus: 200,
        host: initialValue.host,
        port: initialValue.port,
        serviceName: initialValue.serviceName,
        interval: initialValue.interval,
        timeout: initialValue.timeout,
        enabled: initialValue.enabled,
        tags: (initialValue.tags ?? []).join(', '),
      });
      return;
    }

    setValues({
      id: initialValue.id,
      type: 'api',
      name: initialValue.name,
      url: initialValue.url,
      method: initialValue.method,
      expectedStatus: initialValue.expectedStatus ?? 200,
      host: '',
      port: 1521,
      serviceName: '',
      interval: initialValue.interval,
      timeout: initialValue.timeout,
      enabled: initialValue.enabled,
      tags: (initialValue.tags ?? []).join(', '),
    });
  }, [initialValue]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const tags = values.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const endpoint: MonitorEndpoint =
      values.type === 'database'
        ? {
            id: values.id.trim(),
            type: 'database',
            name: values.name.trim(),
            host: values.host.trim(),
            port: Number(values.port),
            serviceName: values.serviceName.trim(),
            interval: Number(values.interval),
            timeout: Number(values.timeout),
            enabled: values.enabled,
            tags,
          }
        : {
            id: values.id.trim(),
            type: 'api',
            name: values.name.trim(),
            url: values.url.trim(),
            method: values.method,
            interval: Number(values.interval),
            timeout: Number(values.timeout),
            enabled: values.enabled,
            expectedStatus: Number(values.expectedStatus),
            tags,
          };

    try {
      setIsSubmitting(true);
      await onSubmit(endpoint);
      if (!initialValue) {
        setValues(EMPTY_FORM);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save endpoint');
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateValue<K extends keyof EndpointFormValues>(key: K, value: EndpointFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">
          {initialValue ? 'Edit Endpoint' : 'New Endpoint'}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="text-sm text-slate-700">
          ID
          <input
            value={values.id}
            onChange={(e) => updateValue('id', e.target.value.toUpperCase())}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="INFOS-AUTOSERVICIO"
          />
        </label>

        <label className="text-sm text-slate-700">
          Name
          <input
            value={values.name}
            onChange={(e) => updateValue('name', e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="INFOS-AUTOSERVICIO"
          />
        </label>

        <label className="text-sm text-slate-700">
          Type
          <select
            value={values.type}
            onChange={(e) => updateValue('type', e.target.value as EndpointFormValues['type'])}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="api">API / Website</option>
            <option value="database">Database</option>
          </select>
        </label>

        <label className="text-sm text-slate-700">
          Enabled
          <select
            value={values.enabled ? 'true' : 'false'}
            onChange={(e) => updateValue('enabled', e.target.value === 'true')}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        {values.type === 'api' ? (
          <>
            <label className="text-sm text-slate-700 md:col-span-2">
              URL
              <input
                value={values.url}
                onChange={(e) => updateValue('url', e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="http://172.20.10.11:8080/..."
              />
            </label>

            <label className="text-sm text-slate-700">
              Method
              <select
                value={values.method}
                onChange={(e) => updateValue('method', e.target.value as EndpointFormValues['method'])}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </label>

            <label className="text-sm text-slate-700">
              Expected Status
              <input
                type="number"
                value={values.expectedStatus}
                onChange={(e) => updateValue('expectedStatus', Number(e.target.value))}
                min={100}
                max={599}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </>
        ) : (
          <>
            <label className="text-sm text-slate-700">
              Host
              <input
                value={values.host}
                onChange={(e) => updateValue('host', e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="172.20.10.10"
              />
            </label>

            <label className="text-sm text-slate-700">
              Port
              <input
                type="number"
                value={values.port}
                onChange={(e) => updateValue('port', Number(e.target.value))}
                min={1}
                max={65535}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-sm text-slate-700 md:col-span-2">
              Service Name
              <input
                value={values.serviceName}
                onChange={(e) => updateValue('serviceName', e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                placeholder="CCTPROD"
              />
            </label>
          </>
        )}

        <label className="text-sm text-slate-700">
          Interval (seconds)
          <input
            type="number"
            value={values.interval}
            onChange={(e) => updateValue('interval', Number(e.target.value))}
            min={5}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-slate-700">
          Timeout (ms)
          <input
            type="number"
            value={values.timeout}
            onChange={(e) => updateValue('timeout', Number(e.target.value))}
            min={100}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm text-slate-700 md:col-span-2">
          Tags (comma separated)
          <input
            value={values.tags}
            onChange={(e) => updateValue('tags', e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Website, Oracle APEX"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
