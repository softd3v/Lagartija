import { useQuery } from '@tanstack/react-query';
import type { MonitorEndpoint, ApiHealthCheck, ApiEndpoint } from '@/types';
import { checkApiHealth } from '@/lib/api-monitor/health-checker';

interface UseApiHealthOptions {
  endpoint: MonitorEndpoint;
  enabled?: boolean;
  refetchInterval?: number | false;
}

export function useApiHealth({
  endpoint,
  enabled = true,
  refetchInterval = false,
}: UseApiHealthOptions) {
  return useQuery<ApiHealthCheck>({
    queryKey: ['api-health', endpoint.id],
    queryFn: async () => {
      // For database endpoints, use the API route
      if (endpoint.type === 'database') {
        const res = await fetch(`/api/monitor/database/${endpoint.id}`);
        if (!res.ok) throw new Error('Failed to check database');
        return res.json();
      }
      // For API endpoints, use the client-side checker
      return checkApiHealth(endpoint as ApiEndpoint);
    },
    enabled: enabled && endpoint.enabled,
    refetchInterval,
    retry: false,
  });
}
