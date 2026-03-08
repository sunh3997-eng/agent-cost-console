export interface RequestLog {
  id: number;
  timestamp: string;
  provider: 'openai' | 'anthropic';
  model: string;
  endpoint: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number;
  duration_ms: number;
  cache_hit: boolean;
  request_hash: string;
  status_code: number;
}

export interface Stats {
  total_requests: number;
  total_tokens: number;
  total_cost_usd: number;
  cache_hits: number;
  cache_hit_rate: number;
  avg_tokens_per_request: number;
  requests_per_minute: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  tokens: number;
  cost_usd: number;
  requests: number;
  cache_hits: number;
}

export interface ModelBreakdown {
  model: string;
  provider: string;
  total_tokens: number;
  total_cost_usd: number;
  request_count: number;
}

export interface DashboardData {
  stats: Stats;
  timeSeries: TimeSeriesPoint[];
  modelBreakdown: ModelBreakdown[];
  recentRequests: RequestLog[];
}
