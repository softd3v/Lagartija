import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { DEFAULT_ENDPOINTS } from '@/config/apis.config';
import type { MonitorEndpoint, ApiEndpoint, DatabaseEndpoint } from '@/types';
import type { MonitorEndpointInput } from '@/lib/validation/endpoint-schema';

type EndpointRow = {
  id: string;
  type: 'api' | 'database';
  name: string;
  url: string | null;
  method: string | null;
  headers_json: string | null;
  host: string | null;
  port: number | null;
  service_name: string | null;
  interval_seconds: number;
  timeout_ms: number;
  enabled: number;
  expected_status: number | null;
  tags_json: string | null;
  created_at: string;
  updated_at: string;
};

const dataDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dataDir, 'xentinel.db');

let dbInstance: Database.Database | null = null;

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
      type TEXT NOT NULL CHECK(type IN ('api', 'database')),
      name TEXT NOT NULL,
      url TEXT,
      method TEXT,
      headers_json TEXT,
      host TEXT,
      port INTEGER,
      service_name TEXT,
      interval_seconds INTEGER NOT NULL,
      timeout_ms INTEGER NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      expected_status INTEGER,
      tags_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_monitor_endpoints_enabled ON monitor_endpoints(enabled);
    CREATE INDEX IF NOT EXISTS idx_monitor_endpoints_type ON monitor_endpoints(type);
  `);

  const count = db.prepare('SELECT COUNT(*) as total FROM monitor_endpoints').get() as { total: number };
  if (count.total === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO monitor_endpoints (
        id, type, name, url, method, headers_json, host, port, service_name,
        interval_seconds, timeout_ms, enabled, expected_status, tags_json, created_at, updated_at
      ) VALUES (
        @id, @type, @name, @url, @method, @headers_json, @host, @port, @service_name,
        @interval_seconds, @timeout_ms, @enabled, @expected_status, @tags_json, @created_at, @updated_at
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

export function createEndpoint(endpoint: MonitorEndpointInput): MonitorEndpoint {
  const db = ensureDb();
  const now = new Date().toISOString();
  const row = toRow(endpoint, now);

  db.prepare(`
    INSERT INTO monitor_endpoints (
      id, type, name, url, method, headers_json, host, port, service_name,
      interval_seconds, timeout_ms, enabled, expected_status, tags_json, created_at, updated_at
    ) VALUES (
      @id, @type, @name, @url, @method, @headers_json, @host, @port, @service_name,
      @interval_seconds, @timeout_ms, @enabled, @expected_status, @tags_json, @created_at, @updated_at
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
