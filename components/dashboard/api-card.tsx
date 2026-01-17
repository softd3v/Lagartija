'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { ApiEndpoint, ApiHealthCheck } from '@/types';
import { checkApiHealth } from '@/lib/api-monitor/health-checker';
import { StatusBadge } from '@/components/ui/status-badge';
import { Clock, RefreshCw, Globe, Tag, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface ApiCardProps {
  endpoint: ApiEndpoint;
  autoPolling?: boolean;
}

export function ApiCard({ endpoint, autoPolling = false }: ApiCardProps) {
  const [lastCheck, setLastCheck] = useState<{
    status: 'up' | 'down';
    responseTime: number;
    timestamp: string;
    error?: string;
    responseData?: any;
  } | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  // Auto-polling query (server-side to trigger alerts)
  const { data: autoData } = useQuery<ApiHealthCheck>({
    queryKey: ['api-monitor', endpoint.id],
    queryFn: async () => {
      const res = await fetch(`/api/monitor/${endpoint.id}`);
      if (!res.ok) throw new Error('Failed to check API');
      return res.json();
    },
    enabled: autoPolling && endpoint.enabled,
    refetchInterval: endpoint.interval * 1000,
    retry: false,
  });

  // Manual check mutation
  const healthCheckMutation = useMutation({
    mutationFn: () => checkApiHealth(endpoint),
    onSuccess: (data) => {
      setLastCheck({
        status: data.status as 'up' | 'down',
        responseTime: data.responseTime,
        timestamp: data.timestamp,
        error: data.error,
        responseData: data.responseData,
      });
    },
  });

  // Update display when auto-polling gets data
  if (autoData && (!lastCheck || autoData.timestamp !== lastCheck.timestamp)) {
    setLastCheck({
      status: autoData.status as 'up' | 'down',
      responseTime: autoData.responseTime,
      timestamp: autoData.timestamp,
      error: autoData.error,
      responseData: autoData.responseData,
    });
  }

  const currentStatus = healthCheckMutation.isPending
    ? 'checking'
    : lastCheck?.status ?? 'unknown';

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-slate-900">
              {endpoint.name}
            </h3>
            {autoPolling && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                <Zap className="w-3 h-3" />
                Auto
              </div>
            )}
          </div>
          <div className="flex items-center text-sm text-slate-600 gap-2">
            <Globe className="w-4 h-4" />
            <span className="font-mono text-xs truncate">{endpoint.url}</span>
          </div>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      {/* Method and Tags */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
          {endpoint.method}
        </span>
        {endpoint.tags && endpoint.tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-slate-500" />
            {endpoint.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {lastCheck && (
        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded">
          <div>
            <p className="text-xs text-slate-600 mb-1">Response Time</p>
            <p className="text-lg font-semibold text-slate-900">
              {lastCheck.responseTime}ms
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 mb-1">Last Checked</p>
            <p className="text-sm font-medium text-slate-900 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(lastCheck.timestamp)}
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {lastCheck?.error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-xs text-red-800">
            <span className="font-semibold">Error:</span> {lastCheck.error}
          </p>
        </div>
      )}

      {/* Response Data */}
      {lastCheck?.responseData && (
        <div className="mb-4">
          <button
            onClick={() => setShowResponse(!showResponse)}
            className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-200 rounded transition-colors text-left"
          >
            <span className="text-sm font-medium text-slate-700">
              Response Data
            </span>
            {showResponse ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </button>
          
          {showResponse && (
            <div className="mt-2 p-3 bg-slate-900 rounded overflow-auto max-h-96">
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-words">
                {typeof lastCheck.responseData === 'string'
                  ? lastCheck.responseData
                  : JSON.stringify(lastCheck.responseData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => healthCheckMutation.mutate()}
        disabled={healthCheckMutation.isPending || !endpoint.enabled}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw
          className={`w-4 h-4 ${healthCheckMutation.isPending ? 'animate-spin' : ''}`}
        />
        {healthCheckMutation.isPending ? 'Checking...' : 'Check Now'}
      </button>
    </div>
  );
}
