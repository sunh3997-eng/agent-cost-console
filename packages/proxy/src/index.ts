import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import fetch from 'node-fetch';

import { estimateCost } from '@agent-cost-console/shared';
import { getDb, insertLog, getStats, getTimeSeries, getLogs } from './db';
import { cache, SemanticCache } from './cache';
import {
  detectProvider,
  extractTokenUsage,
  extractModel,
  buildUpstreamUrl,
  buildUpstreamHeaders,
} from './providers';

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

// ─── Health ───────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', cache: cache.getStats() });
});

// ─── Stats API ────────────────────────────────────────────────────────────
app.get('/api/stats', (_req, res) => {
  res.json(getStats());
});

app.get('/api/timeseries', (req, res) => {
  const bucket = parseInt((req.query.bucket as string) ?? '5', 10);
  const limit = parseInt((req.query.limit as string) ?? '60', 10);
  res.json(getTimeSeries(bucket, limit));
});

app.get('/api/logs', (req, res) => {
  const page = parseInt((req.query.page as string) ?? '1', 10);
  const pageSize = parseInt((req.query.pageSize as string) ?? '50', 10);
  const model = req.query.model as string | undefined;
  res.json(getLogs(page, pageSize, model));
});

app.get('/api/cache/stats', (_req, res) => {
  res.json(cache.getStats());
});

// ─── Proxy handler ────────────────────────────────────────────────────────
async function proxyHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const body = req.body as Record<string, unknown>;
  const provider = detectProvider(req.path, req.headers as Record<string, string | undefined>);
  const model = extractModel(body);
  const requestHash = SemanticCache.hashRequest(body);

  // ── Semantic cache lookup ──────────────────────────────────────────────
  if (CACHE_ENABLED && body.messages) {
    const text = SemanticCache.extractText(body);
    const hit = cache.lookup(text, model);
    if (hit) {
      const latency = Date.now() - startTime;
      insertLog({
        provider,
        model,
        endpoint: req.path,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        latency_ms: latency,
        cache_hit: true,
        cache_key: hit.entry.key,
        status_code: 200,
        request_hash: requestHash,
      });

      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Similarity', hit.similarity.toFixed(4));
      res.json(hit.entry.response);
      return;
    }
  }

  // ── Forward to upstream ───────────────────────────────────────────────
  const upstreamUrl = buildUpstreamUrl(provider, req.path);
  const upstreamHeaders = buildUpstreamHeaders(
    provider,
    req.headers as Record<string, string | undefined>,
  );

  let statusCode = 200;
  let responseBody: Record<string, unknown> = {};
  let errorMsg: string | null = null;

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: req.method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    statusCode = upstreamRes.status;
    const rawText = await upstreamRes.text();

    try {
      responseBody = JSON.parse(rawText);
    } catch {
      responseBody = { raw: rawText };
    }

    // Forward response to client
    res.status(statusCode).setHeader('X-Cache', 'MISS').json(responseBody);

    // Store in cache on success
    if (CACHE_ENABLED && statusCode === 200 && body.messages) {
      const text = SemanticCache.extractText(body);
      cache.store(requestHash, text, model, responseBody);
    }
  } catch (err) {
    statusCode = 502;
    errorMsg = (err as Error).message;
    res.status(502).json({ error: 'Upstream request failed', message: errorMsg });
  }

  // ── Log to DB ─────────────────────────────────────────────────────────
  const latency = Date.now() - startTime;
  const usage = extractTokenUsage(provider, responseBody);
  const cost = estimateCost(model, usage.input, usage.output);

  insertLog({
    provider,
    model,
    endpoint: req.path,
    input_tokens: usage.input,
    output_tokens: usage.output,
    total_tokens: usage.total,
    cost_usd: cost,
    latency_ms: latency,
    cache_hit: false,
    status_code: statusCode,
    error: errorMsg,
    request_hash: requestHash,
  });
}

// OpenAI-compatible proxy routes
app.post('/v1/chat/completions', proxyHandler);
app.post('/v1/completions', proxyHandler);
app.post('/v1/embeddings', proxyHandler);
app.all('/v1/*', proxyHandler);

// Anthropic-compatible proxy routes
app.post('/anthropic/v1/messages', proxyHandler);
app.all('/anthropic/*', proxyHandler);

// ─── Error handler ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// ─── Boot ─────────────────────────────────────────────────────────────────
// Ensure DB is initialised on startup
getDb();

app.listen(PORT, () => {
  console.log(`\n🚀 Agent Cost Console Proxy`);
  console.log(`   Port:  ${PORT}`);
  console.log(`   Cache: ${CACHE_ENABLED ? 'enabled' : 'disabled'}`);
  console.log(`\n   OpenAI drop-in:  http://localhost:${PORT}/v1`);
  console.log(`   Anthropic proxy: http://localhost:${PORT}/anthropic/v1`);
  console.log(`   Dashboard API:   http://localhost:${PORT}/api/stats\n`);
});

export default app;
