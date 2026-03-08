import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.DB_DIR || path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'agent-cost-console.db');

// ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp     TEXT    NOT NULL DEFAULT (datetime('now')),
      provider      TEXT    NOT NULL,
      model         TEXT    NOT NULL,
      endpoint      TEXT    NOT NULL,
      input_tokens  INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      total_tokens  INTEGER NOT NULL DEFAULT 0,
      cost_usd      REAL    NOT NULL DEFAULT 0,
      latency_ms    INTEGER NOT NULL DEFAULT 0,
      cache_hit     INTEGER NOT NULL DEFAULT 0,
      cache_key     TEXT,
      status_code   INTEGER NOT NULL DEFAULT 200,
      error         TEXT,
      request_hash  TEXT    NOT NULL DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_logs_timestamp  ON request_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_logs_model      ON request_logs(model);
    CREATE INDEX IF NOT EXISTS idx_logs_cache_hit  ON request_logs(cache_hit);
    CREATE INDEX IF NOT EXISTS idx_logs_hash       ON request_logs(request_hash);
  `);
}

// ─── Query helpers ────────────────────────────────────────────────────────

export interface LogInsert {
  timestamp?: string;
  provider: string;
  model: string;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
  cache_key?: string | null;
  status_code: number;
  error?: string | null;
  request_hash: string;
}

export function insertLog(log: LogInsert): number {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO request_logs
      (timestamp, provider, model, endpoint,
       input_tokens, output_tokens, total_tokens,
       cost_usd, latency_ms, cache_hit, cache_key,
       status_code, error, request_hash)
    VALUES
      (@timestamp, @provider, @model, @endpoint,
       @input_tokens, @output_tokens, @total_tokens,
       @cost_usd, @latency_ms, @cache_hit, @cache_key,
       @status_code, @error, @request_hash)
  `);
  const result = stmt.run({
    ...log,
    timestamp: log.timestamp ?? new Date().toISOString(),
    cache_hit: log.cache_hit ? 1 : 0,
    cache_key: log.cache_key ?? null,
    error: log.error ?? null,
  });
  return result.lastInsertRowid as number;
}

export function getStats() {
  const db = getDb();

  const totals = db.prepare(`
    SELECT
      COUNT(*)           AS totalRequests,
      COALESCE(SUM(total_tokens), 0) AS totalTokens,
      COALESCE(SUM(cost_usd), 0)     AS totalCostUsd,
      COALESCE(SUM(cache_hit), 0)    AS cacheHits,
      COALESCE(AVG(latency_ms), 0)   AS avgLatencyMs
    FROM request_logs
  `).get() as {
    totalRequests: number;
    totalTokens: number;
    totalCostUsd: number;
    cacheHits: number;
    avgLatencyMs: number;
  };

  const last60s = db.prepare(`
    SELECT COUNT(*) AS cnt
    FROM request_logs
    WHERE timestamp >= datetime('now', '-60 seconds')
  `).get() as { cnt: number };

  const topModels = db.prepare(`
    SELECT
      model,
      provider,
      COUNT(*)        AS requests,
      SUM(total_tokens) AS totalTokens,
      SUM(cost_usd)     AS costUsd,
      SUM(cache_hit)    AS cacheHits
    FROM request_logs
    GROUP BY model, provider
    ORDER BY costUsd DESC
    LIMIT 10
  `).all();

  return {
    totalRequests: totals.totalRequests,
    totalTokens: totals.totalTokens,
    totalCostUsd: totals.totalCostUsd,
    cacheHits: totals.cacheHits,
    cacheHitRate: totals.totalRequests > 0 ? totals.cacheHits / totals.totalRequests : 0,
    avgLatencyMs: Math.round(totals.avgLatencyMs),
    requestsPerMinute: last60s.cnt,
    topModels,
  };
}

export function getTimeSeries(bucketMinutes = 5, limit = 60) {
  const db = getDb();
  // SQLite strftime groups by rounded time bucket
  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m-%dT%H:', timestamp) ||
        printf('%02d', (CAST(strftime('%M', timestamp) AS INTEGER) / ${bucketMinutes}) * ${bucketMinutes})
        || ':00Z'                         AS bucket,
      COUNT(*)                            AS requests,
      COALESCE(SUM(total_tokens), 0)      AS tokens,
      COALESCE(SUM(cost_usd), 0)          AS cost,
      COALESCE(SUM(cache_hit), 0)         AS cacheHits
    FROM request_logs
    WHERE timestamp >= datetime('now', '-${limit * bucketMinutes} minutes')
    GROUP BY bucket
    ORDER BY bucket ASC
  `).all();
  return rows;
}

export function getLogs(page = 1, pageSize = 50, model?: string) {
  const db = getDb();
  const offset = (page - 1) * pageSize;
  const where = model ? `WHERE model = '${model.replace(/'/g, "''")}'` : '';

  const total = (db.prepare(`SELECT COUNT(*) AS cnt FROM request_logs ${where}`).get() as { cnt: number }).cnt;
  const rows = db.prepare(`
    SELECT * FROM request_logs ${where}
    ORDER BY timestamp DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `).all();

  return { rows, total, page, pageSize };
}
