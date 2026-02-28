// API Endpoint Types
export type ApiStatus = "up" | "down" | "unknown" | "checking";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type EndpointType = "api" | "database";

export interface ApiEndpoint {
  id: string;
  type: "api";
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

export interface DatabaseEndpoint {
  id: string;
  type: "database";
  name: string;
  host: string;
  port: number;
  serviceName: string; // TNS/Service Name
  interval: number; // seconds
  timeout: number; // milliseconds
  enabled: boolean;
  tags?: string[];
}

export type MonitorEndpoint = ApiEndpoint | DatabaseEndpoint;

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
