import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'agent-cost-console.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT DEFAULT (datetime('now')),
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    cache_hit INTEGER DEFAULT 0,
    request_hash TEXT,
    status_code INTEGER DEFAULT 200
  );

  CREATE INDEX IF NOT EXISTS idx_timestamp ON request_logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_provider ON request_logs(provider);
  CREATE INDEX IF NOT EXISTS idx_request_hash ON request_logs(request_hash);
`);

// Prepared statements
export const insertLog = db.prepare(`
  INSERT INTO request_logs (
    provider, model, endpoint, prompt_tokens, completion_tokens,
    total_tokens, cost_usd, duration_ms, cache_hit, request_hash, status_code
  ) VALUES (
    @provider, @model, @endpoint, @prompt_tokens, @completion_tokens,
    @total_tokens, @cost_usd, @duration_ms, @cache_hit, @request_hash, @status_code
  )
`);

export const getStats = db.prepare(`
  SELECT
    COUNT(*) as total_requests,
    COALESCE(SUM(total_tokens), 0) as total_tokens,
    COALESCE(SUM(cost_usd), 0) as total_cost_usd,
    COALESCE(SUM(cache_hit), 0) as cache_hits,
    COALESCE(AVG(total_tokens), 0) as avg_tokens_per_request
  FROM request_logs
`);

export const getRequestsPerMinute = db.prepare(`
  SELECT COUNT(*) as count
  FROM request_logs
  WHERE timestamp >= datetime('now', '-1 minute')
`);

export const getTimeSeries = db.prepare(`
  SELECT
    strftime('%Y-%m-%dT%H:%M:00Z', timestamp) as timestamp,
    COALESCE(SUM(total_tokens), 0) as tokens,
    COALESCE(SUM(cost_usd), 0) as cost_usd,
    COUNT(*) as requests,
    COALESCE(SUM(cache_hit), 0) as cache_hits
  FROM request_logs
  WHERE timestamp >= datetime('now', '-1 hour')
  GROUP BY strftime('%Y-%m-%dT%H:%M:00Z', timestamp)
  ORDER BY timestamp ASC
`);

export const getTimeSeriesDay = db.prepare(`
  SELECT
    strftime('%Y-%m-%dT%H:00:00Z', timestamp) as timestamp,
    COALESCE(SUM(total_tokens), 0) as tokens,
    COALESCE(SUM(cost_usd), 0) as cost_usd,
    COUNT(*) as requests,
    COALESCE(SUM(cache_hit), 0) as cache_hits
  FROM request_logs
  WHERE timestamp >= datetime('now', '-24 hours')
  GROUP BY strftime('%Y-%m-%dT%H:00:00Z', timestamp)
  ORDER BY timestamp ASC
`);

export const getModelBreakdown = db.prepare(`
  SELECT
    model,
    provider,
    COALESCE(SUM(total_tokens), 0) as total_tokens,
    COALESCE(SUM(cost_usd), 0) as total_cost_usd,
    COUNT(*) as request_count
  FROM request_logs
  GROUP BY model, provider
  ORDER BY total_cost_usd DESC
`);

export const getRecentRequests = db.prepare(`
  SELECT *
  FROM request_logs
  ORDER BY id DESC
  LIMIT 20
`);

export default db;
