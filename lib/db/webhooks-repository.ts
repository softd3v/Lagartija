import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { WebhookConfig } from '@/types';
import type { WebhookConfigInput } from '@/lib/validation/webhook-schema';

type WebhookRow = {
  id: string;
  name: string;
  url: string;
  type: 'discord' | 'generic' | 'slack';
  enabled: number;
  events_json: string;
  endpoint_ids_json: string | null;
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

  dbInstance = db;
  return db;
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

function fromRow(row: WebhookRow): WebhookConfig {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    type: row.type,
    enabled: Boolean(row.enabled),
    events: parseJsonArray(row.events_json) as WebhookConfig['events'],
    endpointIds: parseJsonArray(row.endpoint_ids_json),
  };
}

function toRow(webhook: WebhookConfigInput, timestamp = new Date().toISOString()) {
  return {
    id: webhook.id,
    name: webhook.name,
    url: webhook.url,
    type: webhook.type,
    enabled: webhook.enabled ? 1 : 0,
    events_json: JSON.stringify(webhook.events),
    endpoint_ids_json: JSON.stringify(webhook.endpointIds ?? []),
    created_at: timestamp,
    updated_at: timestamp,
  };
}

export function getAllWebhooks(): WebhookConfig[] {
  const db = ensureDb();
  const rows = db
    .prepare('SELECT * FROM webhook_configs ORDER BY name ASC')
    .all() as WebhookRow[];
  return rows.map(fromRow);
}

export function getEnabledWebhooks(): WebhookConfig[] {
  return getAllWebhooks().filter((w) => w.enabled);
}

export function getWebhookById(id: string): WebhookConfig | null {
  const db = ensureDb();
  const row = db
    .prepare('SELECT * FROM webhook_configs WHERE id = ?')
    .get(id) as WebhookRow | undefined;
  return row ? fromRow(row) : null;
}

export function createWebhook(webhook: WebhookConfigInput): WebhookConfig {
  const db = ensureDb();
  const now = new Date().toISOString();
  const row = toRow(webhook, now);

  db.prepare(`
    INSERT INTO webhook_configs (
      id, name, url, type, enabled, events_json, endpoint_ids_json, created_at, updated_at
    ) VALUES (
      @id, @name, @url, @type, @enabled, @events_json, @endpoint_ids_json, @created_at, @updated_at
    )
  `).run(row);

  return getWebhookById(webhook.id)!;
}

export function updateWebhook(id: string, webhook: WebhookConfigInput): WebhookConfig | null {
  const db = ensureDb();
  const now = new Date().toISOString();
  const row = toRow(webhook, now);

  const result = db.prepare(`
    UPDATE webhook_configs
    SET
      id = @id,
      name = @name,
      url = @url,
      type = @type,
      enabled = @enabled,
      events_json = @events_json,
      endpoint_ids_json = @endpoint_ids_json,
      updated_at = @updated_at
    WHERE id = ?
  `).run({ ...row, updated_at: now }, id);

  if (result.changes === 0) return null;
  return getWebhookById(webhook.id);
}

export function deleteWebhook(id: string): boolean {
  const db = ensureDb();
  const result = db.prepare('DELETE FROM webhook_configs WHERE id = ?').run(id);
  return result.changes > 0;
}
