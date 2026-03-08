import { Router, Request, Response } from 'express';
import {
  getStats,
  getRequestsPerMinute,
  getTimeSeries,
  getTimeSeriesDay,
  getModelBreakdown,
  getRecentRequests,
} from '../db';
import type { DashboardData, Stats, RequestLog, TimeSeriesPoint, ModelBreakdown } from '@agent-cost-console/shared';

const router = Router();

function buildDashboardData(window: string): DashboardData {
  const rawStats = getStats.get() as {
    total_requests: number;
    total_tokens: number;
    total_cost_usd: number;
    cache_hits: number;
    avg_tokens_per_request: number;
  };

  const rpmRow = getRequestsPerMinute.get() as { count: number };

  const stats: Stats = {
    total_requests: rawStats.total_requests || 0,
    total_tokens: rawStats.total_tokens || 0,
    total_cost_usd: rawStats.total_cost_usd || 0,
    cache_hits: rawStats.cache_hits || 0,
    cache_hit_rate:
      rawStats.total_requests > 0
        ? (rawStats.cache_hits || 0) / rawStats.total_requests
        : 0,
    avg_tokens_per_request: rawStats.avg_tokens_per_request || 0,
    requests_per_minute: rpmRow.count || 0,
  };

  const rawTimeSeries =
    window === 'day'
      ? (getTimeSeriesDay.all() as Array<{
          timestamp: string;
          tokens: number;
          cost_usd: number;
          requests: number;
          cache_hits: number;
        }>)
      : (getTimeSeries.all() as Array<{
          timestamp: string;
          tokens: number;
          cost_usd: number;
          requests: number;
          cache_hits: number;
        }>);

  const timeSeries: TimeSeriesPoint[] = rawTimeSeries.map(row => ({
    timestamp: row.timestamp,
    tokens: row.tokens || 0,
    cost_usd: row.cost_usd || 0,
    requests: row.requests || 0,
    cache_hits: row.cache_hits || 0,
  }));

  const rawModelBreakdown = getModelBreakdown.all() as Array<{
    model: string;
    provider: string;
    total_tokens: number;
    total_cost_usd: number;
    request_count: number;
  }>;

  const modelBreakdown: ModelBreakdown[] = rawModelBreakdown.map(row => ({
    model: row.model,
    provider: row.provider,
    total_tokens: row.total_tokens || 0,
    total_cost_usd: row.total_cost_usd || 0,
    request_count: row.request_count || 0,
  }));

  const rawRecent = getRecentRequests.all() as Array<{
    id: number;
    timestamp: string;
    provider: string;
    model: string;
    endpoint: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    duration_ms: number;
    cache_hit: number;
    request_hash: string;
    status_code: number;
  }>;

  const recentRequests: RequestLog[] = rawRecent.map(row => ({
    id: row.id,
    timestamp: row.timestamp,
    provider: row.provider as 'openai' | 'anthropic',
    model: row.model,
    endpoint: row.endpoint,
    prompt_tokens: row.prompt_tokens || 0,
    completion_tokens: row.completion_tokens || 0,
    total_tokens: row.total_tokens || 0,
    cost_usd: row.cost_usd || 0,
    duration_ms: row.duration_ms || 0,
    cache_hit: Boolean(row.cache_hit),
    request_hash: row.request_hash || '',
    status_code: row.status_code || 200,
  }));

  return { stats, timeSeries, modelBreakdown, recentRequests };
}

// GET /api/dashboard - full dashboard data
router.get('/dashboard', (req: Request, res: Response) => {
  try {
    const window = req.query.window === 'day' ? 'day' : 'hour';
    const data = buildDashboardData(window);
    res.json(data);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/stats - just the stats portion
router.get('/stats', (req: Request, res: Response) => {
  try {
    const data = buildDashboardData('hour');
    res.json(data.stats);
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export { buildDashboardData };
export default router;
