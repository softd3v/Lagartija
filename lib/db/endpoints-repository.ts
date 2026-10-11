import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DEFAULT_ENDPOINTS } from '@/config/apis.config';
import type {
  MonitorEndpoint,
  ApiEndpoint,
  DatabaseEndpoint,
  NetworkEndpoint,
  PingSample,
  DowntimeIncident,
  PingDowntimeSummary,
} from '@/types';
import type { MonitorEndpointInput } from '@/lib/validation/endpoint-schema';

type EndpointRow = {
  id: string;
  type: 'api' | 'database' | 'network';
  name: string;
  url: string | null;
  method: string | null;
  headers_json: string | null;
  host: string | null;
  port: number | null;
  service_name: string | null;
  interval_seconds: number;
  timeout_ms: number;
  ping_packets: number | null;
  down_threshold: number | null;
  recovery_threshold: number | null;
  enabled: number;
  expected_status: number | null;
  tags_json: string | null;
  created_at: string;
  updated_at: string;
};

type PingSampleRow = {
  id: number;
  endpoint_id: string;
  endpoint_name: string;
  host: string;
  status: 'up' | 'down';
  response_time_ms: number | null;
  error: string | null;
  checked_at: string;
};

type DowntimeIncidentRow = {
  id: number;
  endpoint_id: string;
  endpoint_name: string;
  host: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  started_reason: string | null;
  ended_reason: string | null;
};

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'xentinel.db');

let dbInstance: Database.Database | null = null;

function ensureColumn(db: Database.Database, tableName: string, columnName: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function migrateMonitorEndpointsIfNeeded(db: Database.Database) {
  const tableRow = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'monitor_endpoints'")
    .get() as { sql?: string } | undefined;

  const tableSql = tableRow?.sql ?? '';
  if (!tableSql || tableSql.includes("'network'")) {
    return;
  }

  db.exec(`
    BEGIN;
    ALTER TABLE monitor_endpoints RENAME TO monitor_endpoints_legacy;
    CREATE TABLE monitor_endpoints (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('api', 'database', 'network')),
      name TEXT NOT NULL,
      url TEXT,
      method TEXT,
      headers_json TEXT,
      host TEXT,
      port INTEGER,
      service_name TEXT,
      interval_seconds INTEGER NOT NULL,
      timeout_ms INTEGER NOT NULL,
      ping_packets INTEGER,
      down_threshold INTEGER,
      recovery_threshold INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      expected_status INTEGER,
      tags_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO monitor_endpoints (
      id, type, name, url, method, headers_json, host, port, service_name,
      interval_seconds, timeout_ms, enabled, expected_status, tags_json, created_at, updated_at
    )
    SELECT
      id, type, name, url, method, headers_json, host, port, service_name,
      interval_seconds, timeout_ms, enabled, expected_status, tags_json, created_at, updated_at
    FROM monitor_endpoints_legacy;
    DROP TABLE monitor_endpoints_legacy;
    COMMIT;
  `);
}

function ensureDb(): Database.Database {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS monitor_endpoints (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('api', 'database', 'network')),
      name TEXT NOT NULL,
      url TEXT,
      method TEXT,
      headers_json TEXT,
      host TEXT,
      port INTEGER,
      service_name TEXT,
      interval_seconds INTEGER NOT NULL,
      timeout_ms INTEGER NOT NULL,
      ping_packets INTEGER,
      down_threshold INTEGER,
      recovery_threshold INTEGER,
      enabled INTEGER NOT NULL DEFAULT 1,
      expected_status INTEGER,
      tags_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_monitor_endpoints_enabled ON monitor_endpoints(enabled);
    CREATE INDEX IF NOT EXISTS idx_monitor_endpoints_type ON monitor_endpoints(type);
  `);

  migrateMonitorEndpointsIfNeeded(db);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_monitor_endpoints_enabled ON monitor_endpoints(enabled);
    CREATE INDEX IF NOT EXISTS idx_monitor_endpoints_type ON monitor_endpoints(type);
  `);

  // Migration support for existing databases created before network monitoring.
  ensureColumn(db, 'monitor_endpoints', 'ping_packets', 'INTEGER');
  ensureColumn(db, 'monitor_endpoints', 'down_threshold', 'INTEGER');
  ensureColumn(db, 'monitor_endpoints', 'recovery_threshold', 'INTEGER');

  db.exec(`
    CREATE TABLE IF NOT EXISTS ping_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint_id TEXT NOT NULL,
      endpoint_name TEXT NOT NULL,
      host TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('up', 'down')),
      response_time_ms INTEGER,
      error TEXT,
      checked_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ping_samples_endpoint_checked_at
      ON ping_samples(endpoint_id, checked_at);

    CREATE TABLE IF NOT EXISTS downtime_incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint_id TEXT NOT NULL,
      endpoint_name TEXT NOT NULL,
      host TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_ms INTEGER,
      started_reason TEXT,
      ended_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_downtime_incidents_endpoint_started_at
      ON downtime_incidents(endpoint_id, started_at);
    CREATE INDEX IF NOT EXISTS idx_downtime_incidents_open
      ON downtime_incidents(endpoint_id, ended_at);
  `);

  const count = db.prepare('SELECT COUNT(*) as total FROM monitor_endpoints').get() as { total: number };
  if (count.total === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO monitor_endpoints (
        id, type, name, url, method, headers_json, host, port, service_name,
        interval_seconds, timeout_ms, ping_packets, down_threshold, recovery_threshold,
        enabled, expected_status, tags_json, created_at, updated_at
      ) VALUES (
        @id, @type, @name, @url, @method, @headers_json, @host, @port, @service_name,
        @interval_seconds, @timeout_ms, @ping_packets, @down_threshold, @recovery_threshold,
        @enabled, @expected_status, @tags_json, @created_at, @updated_at
      )
    `);

    const now = new Date().toISOString();
    const seedMany = db.transaction((endpoints: MonitorEndpoint[]) => {
      for (const endpoint of endpoints) {
        insertStmt.run(toRow(endpoint, now));
      }
    });

    seedMany(DEFAULT_ENDPOINTS);
  }

  dbInstance = db;
  return db;
}

function toRow(endpoint: MonitorEndpoint, timestamp = new Date().toISOString()) {
  if (endpoint.type === 'database') {
    return {
      id: endpoint.id,
      type: endpoint.type,
      name: endpoint.name,
      url: null,
      method: null,
      headers_json: null,
      host: endpoint.host,
      port: endpoint.port,
      service_name: endpoint.serviceName,
      interval_seconds: endpoint.interval,
      timeout_ms: endpoint.timeout,
      ping_packets: null,
      down_threshold: null,
      recovery_threshold: null,
      enabled: endpoint.enabled ? 1 : 0,
      expected_status: null,
      tags_json: JSON.stringify(endpoint.tags ?? []),
      created_at: timestamp,
      updated_at: timestamp,
    };
  }

  if (endpoint.type === 'network') {
    return {
      id: endpoint.id,
      type: endpoint.type,
      name: endpoint.name,
      url: null,
      method: null,
      headers_json: null,
      host: endpoint.host,
      port: null,
      service_name: null,
      interval_seconds: endpoint.interval,
      timeout_ms: endpoint.timeout,
      ping_packets: endpoint.pingPackets ?? 1,
      down_threshold: endpoint.downThreshold ?? 2,
      recovery_threshold: endpoint.recoveryThreshold ?? 2,
      enabled: endpoint.enabled ? 1 : 0,
      expected_status: null,
      tags_json: JSON.stringify(endpoint.tags ?? []),
      created_at: timestamp,
      updated_at: timestamp,
    };
  }

  return {
    id: endpoint.id,
    type: endpoint.type,
    name: endpoint.name,
    url: endpoint.url,
    method: endpoint.method,
    headers_json: JSON.stringify(endpoint.headers ?? {}),
    host: null,
    port: null,
    service_name: null,
    interval_seconds: endpoint.interval,
    timeout_ms: endpoint.timeout,
    ping_packets: null,
    down_threshold: null,
    recovery_threshold: null,
    enabled: endpoint.enabled ? 1 : 0,
    expected_status: endpoint.expectedStatus ?? null,
    tags_json: JSON.stringify(endpoint.tags ?? []),
    created_at: timestamp,
    updated_at: timestamp,
  };
}

function fromRow(row: EndpointRow): MonitorEndpoint {
  if (row.type === 'database') {
    return {
      id: row.id,
      type: 'database',
      name: row.name,
      host: row.host ?? '',
      port: row.port ?? 1521,
      serviceName: row.service_name ?? '',
      interval: row.interval_seconds,
      timeout: row.timeout_ms,
      enabled: Boolean(row.enabled),
      tags: parseJsonArray(row.tags_json),
    } as DatabaseEndpoint;
  }

  if (row.type === 'network') {
    return {
      id: row.id,
      type: 'network',
      name: row.name,
      host: row.host ?? '',
      interval: row.interval_seconds,
      timeout: row.timeout_ms,
      enabled: Boolean(row.enabled),
      tags: parseJsonArray(row.tags_json),
      pingPackets: row.ping_packets ?? 1,
      downThreshold: row.down_threshold ?? 2,
      recoveryThreshold: row.recovery_threshold ?? 2,
    } as NetworkEndpoint;
  }

  return {
    id: row.id,
    type: 'api',
    name: row.name,
    url: row.url ?? '',
    method: (row.method ?? 'GET') as ApiEndpoint['method'],
    headers: parseJsonObject(row.headers_json),
    interval: row.interval_seconds,
    timeout: row.timeout_ms,
    enabled: Boolean(row.enabled),
    expectedStatus: row.expected_status ?? undefined,
    tags: parseJsonArray(row.tags_json),
  } as ApiEndpoint;
}

function parseJsonArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: string | null): Record<string, string> | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function getAllEndpoints(): MonitorEndpoint[] {
  const db = ensureDb();
  const rows = db
    .prepare('SELECT * FROM monitor_endpoints ORDER BY type ASC, id ASC')
    .all() as EndpointRow[];
  return rows.map(fromRow);
}

export function getEndpointById(id: string): MonitorEndpoint | null {
  const db = ensureDb();
  const row = db
    .prepare('SELECT * FROM monitor_endpoints WHERE id = ?')
    .get(id) as EndpointRow | undefined;
  return row ? fromRow(row) : null;
}

export function getEndpointByIdOrName(value: string): MonitorEndpoint | null {
  const byId = getEndpointById(value);
  if (byId) return byId;

  const db = ensureDb();
  const row = db
    .prepare('SELECT * FROM monitor_endpoints WHERE name = ? COLLATE NOCASE LIMIT 1')
    .get(value) as EndpointRow | undefined;

  return row ? fromRow(row) : null;
}

export function createEndpoint(endpoint: MonitorEndpointInput): MonitorEndpoint {
  const db = ensureDb();
  const now = new Date().toISOString();
  const row = toRow(endpoint, now);

  db.prepare(`
    INSERT INTO monitor_endpoints (
      id, type, name, url, method, headers_json, host, port, service_name,
      interval_seconds, timeout_ms, ping_packets, down_threshold, recovery_threshold,
      enabled, expected_status, tags_json, created_at, updated_at
    ) VALUES (
      @id, @type, @name, @url, @method, @headers_json, @host, @port, @service_name,
      @interval_seconds, @timeout_ms, @ping_packets, @down_threshold, @recovery_threshold,
      @enabled, @expected_status, @tags_json, @created_at, @updated_at
    )
  `).run(row);

  return getEndpointById(endpoint.id)!;
}

export function updateEndpoint(id: string, endpoint: MonitorEndpointInput): MonitorEndpoint | null {
  const db = ensureDb();
  const now = new Date().toISOString();
  const row = toRow(endpoint, now);

  const result = db.prepare(`
    UPDATE monitor_endpoints
    SET
      id = @id,
      type = @type,
      name = @name,
      url = @url,
      method = @method,
      headers_json = @headers_json,
      host = @host,
      port = @port,
      service_name = @service_name,
      interval_seconds = @interval_seconds,
      timeout_ms = @timeout_ms,
      ping_packets = @ping_packets,
      down_threshold = @down_threshold,
      recovery_threshold = @recovery_threshold,
      enabled = @enabled,
      expected_status = @expected_status,
      tags_json = @tags_json,
      updated_at = @updated_at
    WHERE id = ?
  `).run({ ...row, updated_at: now }, id);

  if (result.changes === 0) return null;
  return getEndpointById(endpoint.id);
}

export function deleteEndpoint(id: string): boolean {
  const db = ensureDb();
  const result = db.prepare('DELETE FROM monitor_endpoints WHERE id = ?').run(id);
  return result.changes > 0;
}

export function getPingSamplesByEndpoint(
  endpointId: string,
  from: string,
  to: string,
  limit = 500
): PingSample[] {
  const db = ensureDb();
  const rows = db.prepare(`
    SELECT id, endpoint_id, endpoint_name, host, status, response_time_ms, error, checked_at
    FROM ping_samples
    WHERE endpoint_id = ? AND checked_at >= ? AND checked_at <= ?
    ORDER BY checked_at ASC
    LIMIT ?
  `).all(endpointId, from, to, Math.max(1, Math.min(limit, 5000))) as PingSampleRow[];

  return rows.map((row) => ({
    id: row.id,
    endpointId: row.endpoint_id,
    endpointName: row.endpoint_name,
    host: row.host,
    status: row.status,
    responseTimeMs: row.response_time_ms,
    error: row.error,
    checkedAt: row.checked_at,
  }));
}

export function getDowntimeIncidentsByEndpoint(
  endpointId: string,
  from: string,
  to: string
): DowntimeIncident[] {
  const db = ensureDb();
  const rows = db.prepare(`
    SELECT id, endpoint_id, endpoint_name, host, started_at, ended_at, duration_ms, started_reason, ended_reason
    FROM downtime_incidents
    WHERE endpoint_id = ?
      AND started_at <= ?
      AND (ended_at IS NULL OR ended_at >= ?)
    ORDER BY started_at ASC
  `).all(endpointId, to, from) as DowntimeIncidentRow[];

  return rows.map((row) => ({
    id: row.id,
    endpointId: row.endpoint_id,
    endpointName: row.endpoint_name,
    host: row.host,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    startedReason: row.started_reason,
    endedReason: row.ended_reason,
  }));
}

export function getDowntimeSummaryByEndpoint(
  endpointId: string,
  from: string,
  to: string
): PingDowntimeSummary {
  const db = ensureDb();
  const rows = db.prepare(`
    SELECT started_at, ended_at
    FROM downtime_incidents
    WHERE endpoint_id = ?
      AND started_at <= ?
      AND (ended_at IS NULL OR ended_at >= ?)
    ORDER BY started_at ASC
  `).all(endpointId, to, from) as Array<{ started_at: string; ended_at: string | null }>;

  const fromMs = Date.parse(from);
  const toMs = Date.parse(to);

  let totalDownMs = 0;
  for (const row of rows) {
    const startMs = Math.max(Date.parse(row.started_at), fromMs);
    const rawEndMs = row.ended_at ? Date.parse(row.ended_at) : toMs;
    const endMs = Math.min(rawEndMs, toMs);

    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
      totalDownMs += endMs - startMs;
    }
  }

  return {
    endpointId,
    from,
    to,
    incidents: rows.length,
    totalDownMs,
    totalDownSeconds: Math.floor(totalDownMs / 1000),
  };
}
