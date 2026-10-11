'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { DowntimeIncident, PingSample, PingDowntimeSummary } from '@/types';

type RangeKey = '24h' | '7d' | '30d';

type HistoryResponse = {
  endpoint: {
    id: string;
    name: string;
    host: string;
  };
  from: string;
  to: string;
  count: number;
  samples: PingSample[];
};

type IncidentsResponse = {
  endpoint: {
    id: string;
    name: string;
    host: string;
  };
  from: string;
  to: string;
  incidents: DowntimeIncident[];
  summary: PingDowntimeSummary;
};

function buildRange(range: RangeKey) {
  const now = new Date();
  const from = new Date(now);

  if (range === '7d') {
    from.setDate(now.getDate() - 7);
  } else if (range === '30d') {
    from.setDate(now.getDate() - 30);
  } else {
    from.setHours(now.getHours() - 24);
  }

  return {
    from: from.toISOString(),
    to: now.toISOString(),
  };
}

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatDuration(ms: number | null) {
  if (!ms || ms <= 0) return '-';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function PingHistoryPage() {
  const params = useParams<{ id: string }>();
  const resolvedId = typeof params?.id === 'string' ? params.id : '';
  const [range, setRange] = useState<RangeKey>('24h');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null);
  const [incidentsData, setIncidentsData] = useState<IncidentsResponse | null>(null);

  const rangeParams = useMemo(() => buildRange(range), [range]);

  useEffect(() => {
    if (!resolvedId) return;

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const query = `from=${encodeURIComponent(rangeParams.from)}&to=${encodeURIComponent(rangeParams.to)}&limit=2000`;

        const [historyRes, incidentsRes] = await Promise.all([
          fetch(`/api/monitor/ping/history/${encodeURIComponent(resolvedId)}?${query}`, { cache: 'no-store' }),
          fetch(`/api/monitor/ping/incidents/${encodeURIComponent(resolvedId)}?${query}`, { cache: 'no-store' }),
        ]);

        if (!historyRes.ok) {
          const payload = await historyRes.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load ping history');
        }

        if (!incidentsRes.ok) {
          const payload = await incidentsRes.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to load incidents');
        }

        const [historyPayload, incidentsPayload] = await Promise.all([
          historyRes.json() as Promise<HistoryResponse>,
          incidentsRes.json() as Promise<IncidentsResponse>,
        ]);

        if (cancelled) return;

        setHistoryData(historyPayload);
        setIncidentsData(incidentsPayload);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unknown error loading history');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [resolvedId, rangeParams, refreshKey]);

  return (
    <>
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Network Ping History</h1>
            <p className="text-sm text-slate-600">
              Endpoint: <span className="font-semibold">{historyData?.endpoint.name ?? resolvedId}</span>
              {historyData?.endpoint.host ? ` (${historyData.endpoint.host})` : ''}
            </p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-2">
          {(['24h', '7d', '30d'] as RangeKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                range === key
                  ? 'bg-[#cc0000] text-white'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {key}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="ml-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Loading ping history...
          </div>
        )}

        {!loading && historyData && incidentsData && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Samples</p>
                <p className="text-xl font-semibold text-slate-900">{historyData.count}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Incidents</p>
                <p className="text-xl font-semibold text-slate-900">{incidentsData.summary.incidents}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Total Downtime</p>
                <p className="text-xl font-semibold text-slate-900">{formatDuration(incidentsData.summary.totalDownMs)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Range</p>
                <p className="text-sm font-medium text-slate-900">{formatDate(historyData.from)} - {formatDate(historyData.to)}</p>
              </div>
            </div>

            <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Ping Samples</h2>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-4">Checked At</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Response (ms)</th>
                      <th className="py-2 pr-4">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.samples.map((sample) => (
                      <tr key={sample.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-800">{formatDate(sample.checkedAt)}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              sample.status === 'up'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {sample.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-800">{sample.responseTimeMs ?? '-'}</td>
                        <td className="py-2 pr-4 text-slate-600">{sample.error ?? '-'}</td>
                      </tr>
                    ))}
                    {historyData.samples.length === 0 && (
                      <tr>
                        <td className="py-3 text-slate-500" colSpan={4}>
                          No samples in selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Downtime Incidents</h2>
              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-600">
                      <th className="py-2 pr-4">Started At</th>
                      <th className="py-2 pr-4">Ended At</th>
                      <th className="py-2 pr-4">Duration</th>
                      <th className="py-2 pr-4">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidentsData.incidents.map((incident) => (
                      <tr key={incident.id} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-800">{formatDate(incident.startedAt)}</td>
                        <td className="py-2 pr-4 text-slate-800">{formatDate(incident.endedAt)}</td>
                        <td className="py-2 pr-4 text-slate-800">{formatDuration(incident.durationMs)}</td>
                        <td className="py-2 pr-4 text-slate-600">{incident.startedReason ?? '-'}</td>
                      </tr>
                    ))}
                    {incidentsData.incidents.length === 0 && (
                      <tr>
                        <td className="py-3 text-slate-500" colSpan={4}>
                          No incidents in selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
    </>
  );
}
