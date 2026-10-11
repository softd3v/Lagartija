// API Endpoint Types
export type ApiStatus = "up" | "down" | "unknown" | "checking";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export type EndpointType = "api" | "database" | "network";

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

export interface NetworkEndpoint {
  id: string;
  type: "network";
  name: string;
  host: string; // IP or hostname to ping
  interval: number; // seconds
  timeout: number; // milliseconds
  enabled: boolean;
  tags?: string[];
  pingPackets?: number; // ICMP echo requests per check
  downThreshold?: number; // consecutive failures required to mark DOWN
  recoveryThreshold?: number; // consecutive successes required to mark RECOVERED
}

export type MonitorEndpoint = ApiEndpoint | DatabaseEndpoint | NetworkEndpoint;

export interface ApiHealthCheck {
  endpointId: string;
  status: ApiStatus;
  responseTime: number; // milliseconds
  statusCode?: number;
  timestamp: string;
  error?: string;
  responseData?: unknown; // JSON response from endpoint
  databaseConnected?: boolean; // Database connection status from response
  databaseError?: string; // Database error message if any
}

export interface ApiMonitorState {
  endpoint: MonitorEndpoint;
  currentStatus: ApiStatus;
  lastCheck?: ApiHealthCheck;
  history: ApiHealthCheck[];
}

export interface PingSample {
  id: number;
  endpointId: string;
  endpointName: string;
  host: string;
  status: "up" | "down";
  responseTimeMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface DowntimeIncident {
  id: number;
  endpointId: string;
  endpointName: string;
  host: string;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  startedReason: string | null;
  endedReason: string | null;
}

export interface PingDowntimeSummary {
  endpointId: string;
  from: string;
  to: string;
  incidents: number;
  totalDownMs: number;
  totalDownSeconds: number;
}

export type AlertType =
  | 'down'
  | 'recovered'
  | 'database-down'
  | 'database-recovered';

export type WebhookType = 'discord' | 'generic' | 'slack';

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  type: WebhookType;
  enabled: boolean;
  events: AlertType[];
  endpointIds: string[];
}
