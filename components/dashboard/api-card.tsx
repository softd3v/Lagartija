'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { MonitorEndpoint, ApiHealthCheck, ApiEndpoint } from '@/types';
import { checkApiHealth } from '@/lib/api-monitor/health-checker';
import { StatusBadge } from '@/components/ui/status-badge';
import { Clock, RefreshCw, Globe, Tag, ChevronDown, ChevronUp, Zap, Database } from 'lucide-react';

interface ApiCardProps {
  endpoint: MonitorEndpoint;
  autoPolling?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function ApiCard({
  endpoint,
  autoPolling = false,
  onEdit,
  onDelete,
  isDeleting = false,
}: ApiCardProps) {
  const [lastCheck, setLastCheck] = useState<ApiHealthCheck | null>(null);
  const [showResponse, setShowResponse] = useState(false);

  // Determine the correct API route based on endpoint type
  const apiRoute = endpoint.type === 'database' 
    ? `/api/monitor/database/${endpoint.id}`
    : `/api/monitor/${endpoint.id}`;

  // Auto-polling query (server-side to trigger alerts)
  const { data: autoData } = useQuery<ApiHealthCheck>({
    queryKey: ['api-monitor', endpoint.id],
    queryFn: async () => {
      const res = await fetch(apiRoute);
      if (!res.ok) throw new Error(`Failed to check ${endpoint.type}`);
      return res.json();
    },
    enabled: autoPolling && endpoint.enabled,
    refetchInterval: endpoint.interval * 1000,
    retry: false,
  });

  // Manual check mutation
  const healthCheckMutation = useMutation({
    mutationFn: async () => {
      if (endpoint.type === 'database') {
        const res = await fetch(apiRoute);
        if (!res.ok) throw new Error('Failed to check database');
        return res.json();
      }
      return checkApiHealth(endpoint as ApiEndpoint);
    },
    onSuccess: (data) => {
      setLastCheck({
        endpointId: data.endpointId ?? endpoint.id,
        status: data.status as 'up' | 'down',
        responseTime: data.responseTime,
        timestamp: data.timestamp,
        error: data.error,
        databaseConnected: data.databaseConnected,
        databaseError: data.databaseError,
        responseData: data.responseData,
      });
    },
  });

  // Update display when auto-polling gets data
  if (autoData && (!lastCheck || autoData.timestamp !== lastCheck.timestamp)) {
    setLastCheck({
      endpointId: autoData.endpointId ?? endpoint.id,
      status: autoData.status as 'up' | 'down',
      responseTime: autoData.responseTime,
      timestamp: autoData.timestamp,
      error: autoData.error,
      databaseConnected: autoData.databaseConnected,
      databaseError: autoData.databaseError,
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
      <div className="mb-4 flex items-start justify-between gap-3">
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
            {endpoint.type === 'database' ? (
              <>
                <Database className="w-4 h-4" />
                <span className="font-mono text-xs truncate">
                  {endpoint.host}:{endpoint.port}/{endpoint.serviceName}
                </span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" />
                <span className="font-mono text-xs truncate">{endpoint.url}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={currentStatus} />
          {(onEdit || onDelete) && (
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isDeleting}
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Method/Type and Tags */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
          {endpoint.type === 'database' ? 'DATABASE' : endpoint.method}
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

      {/* Database Status */}
      {lastCheck?.databaseConnected !== undefined && (
        <div className={`mb-4 p-3 rounded border ${
          lastCheck.databaseConnected 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">
              {lastCheck.databaseConnected ? '✅' : '❌'} Database:
            </span>
            <span className={`text-sm font-medium ${
              lastCheck.databaseConnected ? 'text-green-800' : 'text-red-800'
            }`}>
              {lastCheck.databaseConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {lastCheck.databaseError && (
            <p className="text-xs text-red-800 mt-2">
              <span className="font-semibold">Error:</span> {lastCheck.databaseError}
            </p>
          )}
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
      {Boolean(lastCheck?.responseData) && (
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
                {typeof lastCheck?.responseData === 'string'
                  ? String(lastCheck?.responseData)
                  : JSON.stringify(lastCheck?.responseData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => healthCheckMutation.mutate()}
        disabled={healthCheckMutation.isPending || !endpoint.enabled}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#cc0000] text-white rounded-md hover:bg-[#aa0000] disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw
          className={`w-4 h-4 ${healthCheckMutation.isPending ? 'animate-spin' : ''}`}
        />
        {healthCheckMutation.isPending ? 'Checking...' : 'Check Now'}
      </button>
    </div>
  );
}
