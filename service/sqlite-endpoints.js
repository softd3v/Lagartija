const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'xentinel.db');

function ensureColumn(db, tableName, columnName, definition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function migrateMonitorEndpointsIfNeeded(db) {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'monitor_endpoints'").get();
  const tableSql = row && row.sql ? row.sql : '';

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

function ensureDbSchema(db) {
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

    CREATE TABLE IF NOT EXISTS webhook_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'discord' CHECK(type IN ('discord', 'generic', 'slack')),
      enabled INTEGER NOT NULL DEFAULT 1,
      events_json TEXT NOT NULL,
      endpoint_ids_json TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_configs_enabled ON webhook_configs(enabled);
  `);

  migrateMonitorEndpointsIfNeeded(db);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_monitor_endpoints_enabled ON monitor_endpoints(enabled);
    CREATE INDEX IF NOT EXISTS idx_monitor_endpoints_type ON monitor_endpoints(type);
  `);

  ensureColumn(db, 'monitor_endpoints', 'ping_packets', 'INTEGER');
  ensureColumn(db, 'monitor_endpoints', 'down_threshold', 'INTEGER');
  ensureColumn(db, 'monitor_endpoints', 'recovery_threshold', 'INTEGER');
}

function getDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const db = new Database(dbPath);
  ensureDbSchema(db);
  return db;
}

function rowToEndpoint(row, envConfig) {
  if (row.type === 'database') {
    return {
      id: row.id,
      type: 'database',
      name: row.name,
      host: row.host,
      port: row.port,
      serviceName: row.service_name,
      username: envConfig[`DB_${row.id}_USER`],
      password: envConfig[`DB_${row.id}_PASSWORD`],
      interval: Number(row.interval_seconds) * 1000,
      timeout: Number(row.timeout_ms),
      enabled: Boolean(row.enabled),
    };
  }

  if (row.type === 'network') {
    return {
      id: row.id,
      type: 'network',
      name: row.name,
      host: row.host,
      interval: Number(row.interval_seconds) * 1000,
      timeout: Number(row.timeout_ms),
      enabled: Boolean(row.enabled),
      pingPackets: row.ping_packets ? Number(row.ping_packets) : 1,
      downThreshold: row.down_threshold ? Number(row.down_threshold) : 2,
      recoveryThreshold: row.recovery_threshold ? Number(row.recovery_threshold) : 2,
    };
  }

  return {
    id: row.id,
    type: 'api',
    name: row.name,
    url: row.url,
    method: row.method || 'GET',
    interval: Number(row.interval_seconds) * 1000,
    timeout: Number(row.timeout_ms),
    enabled: Boolean(row.enabled),
  };
}

function endpointToRow(endpoint, now) {
  const isDb = endpoint.type === 'database';
  const isNetwork = endpoint.type === 'network';
  return {
    id: endpoint.id,
    type: endpoint.type,
    name: endpoint.name,
    url: isDb || isNetwork ? null : endpoint.url,
    method: isDb || isNetwork ? null : endpoint.method,
    headers_json: null,
    host: isDb || isNetwork ? endpoint.host : null,
    port: isDb ? endpoint.port : null,
    service_name: isDb ? endpoint.serviceName : null,
    interval_seconds: Math.round(endpoint.interval / 1000),
    timeout_ms: endpoint.timeout,
    ping_packets: isNetwork ? (endpoint.pingPackets || 1) : null,
    down_threshold: isNetwork ? (endpoint.downThreshold || 2) : null,
    recovery_threshold: isNetwork ? (endpoint.recoveryThreshold || 2) : null,
    enabled: endpoint.enabled ? 1 : 0,
    expected_status: null,
    tags_json: '[]',
    created_at: now,
    updated_at: now,
  };
}

function seedFromFallback(fallbackEndpoints) {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as total FROM monitor_endpoints').get();

  if (count.total > 0) {
    db.close();
    return { seeded: false, total: count.total };
  }

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
  const tx = db.transaction(() => {
    fallbackEndpoints.forEach((endpoint) => {
      insertStmt.run(endpointToRow(endpoint, now));
    });
  });
  tx();

  const result = db.prepare('SELECT COUNT(*) as total FROM monitor_endpoints').get();
  db.close();
  return { seeded: true, total: result.total };
}

function loadMonitorEndpoints(fallbackEndpoints, envConfig) {
  try {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM monitor_endpoints WHERE enabled = 1 ORDER BY type ASC, id ASC')
      .all();
    db.close();

    if (!rows.length) {
      return fallbackEndpoints;
    }

    return rows.map((row) => rowToEndpoint(row, envConfig));
  } catch {
    return fallbackEndpoints;
  }
}

function savePingSample(sample) {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO ping_samples (
      endpoint_id, endpoint_name, host, status, response_time_ms, error, checked_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sample.endpointId,
    sample.endpointName,
    sample.host,
    sample.status,
    sample.responseTimeMs,
    sample.error || null,
    sample.checkedAt,
    now,
  );

  db.close();
}

function openDowntimeIncident(incident) {
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare(`
    SELECT id FROM downtime_incidents
    WHERE endpoint_id = ? AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `).get(incident.endpointId);

  if (existing) {
    db.close();
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO downtime_incidents (
      endpoint_id, endpoint_name, host, started_at, started_reason, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    incident.endpointId,
    incident.endpointName,
    incident.host,
    incident.startedAt,
    incident.startedReason || null,
    now,
    now,
  );

  db.close();
  return Number(result.lastInsertRowid);
}

function closeDowntimeIncident(endpointId, endedAt, endedReason) {
  const db = getDb();

  const openIncident = db.prepare(`
    SELECT id, started_at FROM downtime_incidents
    WHERE endpoint_id = ? AND ended_at IS NULL
    ORDER BY started_at DESC
    LIMIT 1
  `).get(endpointId);

  if (!openIncident) {
    db.close();
    return null;
  }

  const durationMs = Date.parse(endedAt) - Date.parse(openIncident.started_at);
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE downtime_incidents
    SET ended_at = ?, duration_ms = ?, ended_reason = ?, updated_at = ?
    WHERE id = ?
  `).run(
    endedAt,
    Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0,
    endedReason || null,
    now,
    openIncident.id,
  );

  db.close();
  return openIncident.id;
}

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadWebhooks() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT id, name, url, type, enabled, events_json, endpoint_ids_json
    FROM webhook_configs
    WHERE enabled = 1
    ORDER BY name ASC
  `).all();

  db.close();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    type: row.type,
    enabled: Boolean(row.enabled),
    events: parseJsonArray(row.events_json),
    endpointIds: parseJsonArray(row.endpoint_ids_json),
  }));
}

module.exports = {
  dbPath,
  loadMonitorEndpoints,
  loadWebhooks,
  seedFromFallback,
  savePingSample,
  openDowntimeIncident,
  closeDowntimeIncident,
};
