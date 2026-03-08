// ─── Provider & Model Types ────────────────────────────────────────────────

export type Provider = 'openai' | 'anthropic' | 'unknown';

export interface ModelPricing {
  inputPer1kTokens: number;   // USD per 1k input tokens
  outputPer1kTokens: number;  // USD per 1k output tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { inputPer1kTokens: 0.005, outputPer1kTokens: 0.015 },
  'gpt-4o-mini': { inputPer1kTokens: 0.00015, outputPer1kTokens: 0.0006 },
  'gpt-4-turbo': { inputPer1kTokens: 0.01, outputPer1kTokens: 0.03 },
  'gpt-4': { inputPer1kTokens: 0.03, outputPer1kTokens: 0.06 },
  'gpt-3.5-turbo': { inputPer1kTokens: 0.0005, outputPer1kTokens: 0.0015 },
  'o1-preview': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.06 },
  'o1-mini': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.012 },
  // Anthropic
  'claude-3-5-sonnet-20241022': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 },
  'claude-3-5-haiku-20241022': { inputPer1kTokens: 0.0008, outputPer1kTokens: 0.004 },
  'claude-3-opus-20240229': { inputPer1kTokens: 0.015, outputPer1kTokens: 0.075 },
  'claude-3-sonnet-20240229': { inputPer1kTokens: 0.003, outputPer1kTokens: 0.015 },
  'claude-3-haiku-20240307': { inputPer1kTokens: 0.00025, outputPer1kTokens: 0.00125 },
};

export function getPricing(model: string): ModelPricing {
  // Exact match first
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];
  // Prefix match
  const key = Object.keys(MODEL_PRICING).find(k => model.startsWith(k) || k.startsWith(model));
  return key ? MODEL_PRICING[key] : { inputPer1kTokens: 0.002, outputPer1kTokens: 0.002 };
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const p = getPricing(model);
  return (inputTokens / 1000) * p.inputPer1kTokens + (outputTokens / 1000) * p.outputPer1kTokens;
}

// ─── Database Row Types ────────────────────────────────────────────────────

export interface RequestLog {
  id: number;
  timestamp: string;       // ISO-8601
  provider: Provider;
  model: string;
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
  cache_key: string | null;
  status_code: number;
  error: string | null;
  request_hash: string;
}

// ─── API Response Types ────────────────────────────────────────────────────

export interface StatsOverview {
  totalRequests: number;
  totalTokens: number;
  totalCostUsd: number;
  cacheHits: number;
  cacheHitRate: number;         // 0-1
  avgLatencyMs: number;
  requestsPerMinute: number;    // last 60s
  topModels: ModelStats[];
}

export interface ModelStats {
  model: string;
  provider: Provider;
  requests: number;
  totalTokens: number;
  costUsd: number;
  cacheHits: number;
}

export interface TimeSeriesPoint {
  timestamp: string;   // ISO-8601 bucket
  requests: number;
  tokens: number;
  cost: number;
  cacheHits: number;
}

export interface RequestLogRow extends RequestLog {
  // serialised for API responses
}

export interface PaginatedLogs {
  rows: RequestLogRow[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Cache Types ──────────────────────────────────────────────────────────

export interface CacheEntry {
  key: string;
  embedding: number[];
  response: unknown;
  model: string;
  createdAt: number;   // Unix ms
  hitCount: number;
}

// ─── Proxy Config ─────────────────────────────────────────────────────────

export interface ProxyConfig {
  port: number;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  cacheEnabled: boolean;
  cacheSimilarityThreshold: number;  // 0-1, default 0.92
  cacheMaxEntries: number;
}
