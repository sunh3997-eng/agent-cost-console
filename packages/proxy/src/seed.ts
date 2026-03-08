/**
 * Seed script — populates the SQLite DB with realistic sample data
 * so the dashboard is interesting out of the box.
 *
 * Run: npm run seed --workspace=packages/proxy
 */

import 'dotenv/config';
import { getDb, insertLog } from './db';
import { estimateCost } from '@agent-cost-console/shared';

const MODELS = [
  { model: 'gpt-4o', provider: 'openai', weight: 3 },
  { model: 'gpt-4o-mini', provider: 'openai', weight: 8 },
  { model: 'gpt-3.5-turbo', provider: 'openai', weight: 5 },
  { model: 'claude-3-5-sonnet-20241022', provider: 'anthropic', weight: 4 },
  { model: 'claude-3-5-haiku-20241022', provider: 'anthropic', weight: 6 },
  { model: 'claude-3-opus-20240229', provider: 'anthropic', weight: 1 },
] as const;

const ENDPOINTS = ['/v1/chat/completions', '/v1/completions', '/anthropic/v1/messages'];

function pickWeighted(): (typeof MODELS)[number] {
  const total = MODELS.reduce((s, m) => s + m.weight, 0);
  let r = Math.random() * total;
  for (const m of MODELS) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return MODELS[0];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateTimestamp(daysAgo: number): string {
  const d = new Date();
  d.setTime(d.getTime() - daysAgo * 86400_000 - randInt(0, 86400_000 - 1));
  return d.toISOString();
}

async function seed() {
  const db = getDb();

  // Check existing rows
  const existing = (db.prepare('SELECT COUNT(*) AS cnt FROM request_logs').get() as { cnt: number }).cnt;
  if (existing > 0) {
    console.log(`DB already has ${existing} rows. Run with FORCE_SEED=1 to re-seed.`);
    if (process.env.FORCE_SEED !== '1') process.exit(0);
    db.prepare('DELETE FROM request_logs').run();
    console.log('Cleared existing rows.');
  }

  console.log('Seeding sample data...');
  let inserted = 0;

  // Generate 7 days of data with increasing volume
  for (let day = 6; day >= 0; day--) {
    const requestsThisDay = randInt(80, 300);

    for (let i = 0; i < requestsThisDay; i++) {
      const { model, provider } = pickWeighted();
      const cacheHit = Math.random() < 0.22;
      const inputTokens = cacheHit ? 0 : randInt(50, 2000);
      const outputTokens = cacheHit ? 0 : randInt(20, 800);
      const totalTokens = inputTokens + outputTokens;
      const cost = cacheHit ? 0 : estimateCost(model, inputTokens, outputTokens);
      const latency = cacheHit ? randInt(1, 15) : randInt(300, 8000);
      const statusCode = Math.random() < 0.97 ? 200 : (Math.random() < 0.5 ? 429 : 500);

      insertLog({
        timestamp: generateTimestamp(day),
        provider,
        model,
        endpoint: ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)],
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost_usd: cost,
        latency_ms: latency,
        cache_hit: cacheHit,
        cache_key: cacheHit ? `seed-${Math.random().toString(36).slice(2, 10)}` : null,
        status_code: statusCode,
        error: statusCode !== 200 ? `Simulated ${statusCode} error` : null,
        request_hash: Math.random().toString(36).slice(2, 18),
      });
      inserted++;
    }
  }

  console.log(`✅ Seeded ${inserted} rows across 7 days.`);

  // Print summary
  const stats = db.prepare(`
    SELECT
      model,
      COUNT(*) AS reqs,
      SUM(total_tokens) AS tokens,
      ROUND(SUM(cost_usd), 4) AS cost,
      SUM(cache_hit) AS hits
    FROM request_logs
    GROUP BY model
    ORDER BY cost DESC
  `).all();
  console.table(stats);

  process.exit(0);
}

seed().catch(e => {
  console.error(e);
  process.exit(1);
});
