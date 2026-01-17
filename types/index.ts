// API Endpoint Types
export type ApiStatus = "up" | "down" | "unknown" | "checking";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiEndpoint {
  id: string;
  name: string;
  url: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  interval: number; // seconds
  timeout: number; // milliseconds
  enabled: boolean;
  expectedStatus?: number;
  tags?: string[];
}

export interface ApiHealthCheck {
  endpointId: string;
  status: ApiStatus;
  responseTime: number; // milliseconds
  statusCode?: number;
  timestamp: string;
  error?: string;
  responseData?: any; // JSON response from endpoint
  databaseConnected?: boolean; // Database connection status from response
  databaseError?: string; // Database error message if any
}

export interface ApiMonitorState {
  endpoint: ApiEndpoint;
  currentStatus: ApiStatus;
  lastCheck?: ApiHealthCheck;
  history: ApiHealthCheck[];
}
