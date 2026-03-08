import { useState, useEffect, useCallback } from 'react';
import type { StatsOverview, TimeSeriesPoint, PaginatedLogs } from '@agent-cost-console/shared';

const API_BASE = '/api';

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Stats overview ───────────────────────────────────────────────────────

export function useStats(refreshMs = 5000) {
  const [data, setData] = useState<StatsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await apiFetch<StatsOverview>('/stats');
      setData(res);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, refreshMs);
    return () => clearInterval(id);
  }, [fetch_, refreshMs]);

  return { data, error, loading, refetch: fetch_ };
}

// ─── Time series ──────────────────────────────────────────────────────────

export function useTimeSeries(bucket = 5, limit = 48, refreshMs = 10000) {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await apiFetch<TimeSeriesPoint[]>(`/timeseries?bucket=${bucket}&limit=${limit}`);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [bucket, limit]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, refreshMs);
    return () => clearInterval(id);
  }, [fetch_, refreshMs]);

  return { data, loading };
}

// ─── Logs ─────────────────────────────────────────────────────────────────

export function useLogs(page = 1, pageSize = 50, model?: string, refreshMs = 10000) {
  const [data, setData] = useState<PaginatedLogs | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (model) params.set('model', model);
      const res = await apiFetch<PaginatedLogs>(`/logs?${params}`);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, model]);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, refreshMs);
    return () => clearInterval(id);
  }, [fetch_, refreshMs]);

  return { data, loading, refetch: fetch_ };
}
