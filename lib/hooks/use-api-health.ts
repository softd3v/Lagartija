import { useQuery } from '@tanstack/react-query';
import type { ApiEndpoint, ApiHealthCheck } from '@/types';
import { checkApiHealth } from '@/lib/api-monitor/health-checker';

interface UseApiHealthOptions {
  endpoint: ApiEndpoint;
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
    queryFn: () => checkApiHealth(endpoint),
    enabled: enabled && endpoint.enabled,
    refetchInterval,
    retry: false,
  });
}
