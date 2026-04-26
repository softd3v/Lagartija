const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'xentinel.db');

function ensureDbSchema(db) {
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
  `);
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
  return {
    id: endpoint.id,
    type: endpoint.type,
    name: endpoint.name,
    url: isDb ? null : endpoint.url,
    method: isDb ? null : endpoint.method,
    headers_json: null,
    host: isDb ? endpoint.host : null,
    port: isDb ? endpoint.port : null,
    service_name: isDb ? endpoint.serviceName : null,
    interval_seconds: Math.round(endpoint.interval / 1000),
    timeout_ms: endpoint.timeout,
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
      interval_seconds, timeout_ms, enabled, expected_status, tags_json, created_at, updated_at
    ) VALUES (
      @id, @type, @name, @url, @method, @headers_json, @host, @port, @service_name,
      @interval_seconds, @timeout_ms, @enabled, @expected_status, @tags_json, @created_at, @updated_at
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

module.exports = {
  dbPath,
  loadMonitorEndpoints,
  seedFromFallback,
};
