import type { ApiEndpoint, ApiHealthCheck, ApiStatus } from '@/types';

export async function checkApiHealth(
  endpoint: ApiEndpoint
): Promise<ApiHealthCheck> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: endpoint.headers,
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    // Try to parse response as JSON
    let responseData;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const text = await response.text();
        responseData = text.substring(0, 500); // Limit text responses
      }
    } catch (e) {
      responseData = null;
    }

    const expectedStatus = endpoint.expectedStatus ?? 200;
    const status: ApiStatus = response.ok && response.status === expectedStatus ? 'up' : 'down';

    // Extract database connection status if available
    let databaseConnected: boolean | undefined;
    let databaseError: string | undefined;
    if (responseData && typeof responseData === 'object' && 'database' in responseData) {
      databaseConnected = responseData.database?.connected;
      databaseError = responseData.database?.error;
    }

    return {
      endpointId: endpoint.id,
      status,
      responseTime,
      statusCode: response.status,
      timestamp,
      responseData,
      databaseConnected,
      databaseError,
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Timeout after ${endpoint.timeout}ms`;
      } else {
        errorMessage = error.message;
      }
    }

    return {
      endpointId: endpoint.id,
      status: 'down',
      responseTime,
      timestamp,
      error: errorMessage,
    };
  }
}
