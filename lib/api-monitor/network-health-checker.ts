import { execFile } from 'child_process';
import type { ApiHealthCheck, NetworkEndpoint } from '@/types';

function parsePingResponseTime(output: string): number | null {
  const lessThanMatch = output.match(/time<\s*(\d+)ms/i);
  if (lessThanMatch) return 1;

  const equalsMatch = output.match(/time[=<]\s*(\d+)ms/i);
  if (equalsMatch) return Number(equalsMatch[1]);

  const avgMatch = output.match(/Average\s*=\s*(\d+)ms/i);
  if (avgMatch) return Number(avgMatch[1]);

  return null;
}

export async function checkNetworkHealth(endpoint: NetworkEndpoint): Promise<ApiHealthCheck> {
  const timestamp = new Date().toISOString();
  const packetCount = endpoint.pingPackets ?? 1;

  return new Promise((resolve) => {
    const args = ['-n', String(packetCount), '-w', String(endpoint.timeout), endpoint.host];

    execFile('ping', args, { windowsHide: true }, (error, stdout = '', stderr = '') => {
      const responseTime = parsePingResponseTime(stdout);

      if (!error && responseTime !== null) {
        resolve({
          endpointId: endpoint.id,
          status: 'up',
          responseTime,
          timestamp,
        });
        return;
      }

      const derivedError = stderr.trim()
        || stdout
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(-1)[0]
        || (error ? error.message : 'Ping failed');

      resolve({
        endpointId: endpoint.id,
        status: 'down',
        responseTime: responseTime ?? endpoint.timeout,
        timestamp,
        error: derivedError,
      });
    });
  });
}
