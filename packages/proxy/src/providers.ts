import { Provider } from '@agent-cost-console/shared';

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

/**
 * Detect provider from the URL path or request headers.
 */
export function detectProvider(path: string, headers: Record<string, string | string[] | undefined>): Provider {
  if (path.startsWith('/anthropic') || headers['x-provider'] === 'anthropic') return 'anthropic';
  if (path.startsWith('/v1') || headers['x-provider'] === 'openai') return 'openai';
  const auth = (headers['authorization'] as string | undefined) ?? '';
  if (auth.startsWith('sk-ant-')) return 'anthropic';
  return 'openai';
}

/**
 * Extract token usage from a provider response body.
 */
export function extractTokenUsage(provider: Provider, body: Record<string, unknown>): TokenUsage {
  if (provider === 'openai') {
    const usage = body.usage as Record<string, number> | undefined;
    const input = usage?.prompt_tokens ?? 0;
    const output = usage?.completion_tokens ?? 0;
    return { input, output, total: input + output };
  }

  if (provider === 'anthropic') {
    const usage = body.usage as Record<string, number> | undefined;
    const input = usage?.input_tokens ?? 0;
    const output = usage?.output_tokens ?? 0;
    return { input, output, total: input + output };
  }

  return { input: 0, output: 0, total: 0 };
}

/**
 * Detect model name from request body.
 */
export function extractModel(body: Record<string, unknown>): string {
  return (body.model as string) ?? 'unknown';
}

/**
 * Build the upstream URL for a given provider.
 */
export function buildUpstreamUrl(provider: Provider, path: string): string {
  // Strip provider prefix if present
  const cleanPath = path.replace(/^\/(openai|anthropic)/, '');

  if (provider === 'anthropic') {
    return `https://api.anthropic.com${cleanPath}`;
  }
  return `https://api.openai.com${cleanPath}`;
}

/**
 * Build headers to forward to the upstream provider.
 */
export function buildUpstreamHeaders(
  provider: Provider,
  incomingHeaders: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const auth = (incomingHeaders['authorization'] as string | undefined) ?? '';
  const xApiKey = (incomingHeaders['x-api-key'] as string | undefined) ?? '';

  if (provider === 'anthropic') {
    // Prefer x-api-key, fall back to env var
    const key = xApiKey || process.env.ANTHROPIC_API_KEY || '';
    if (key) headers['x-api-key'] = key;
    headers['anthropic-version'] = (incomingHeaders['anthropic-version'] as string) ?? '2023-06-01';
  } else {
    // OpenAI: use Authorization Bearer
    const key = auth || (process.env.OPENAI_API_KEY ? `Bearer ${process.env.OPENAI_API_KEY}` : '');
    if (key) headers['Authorization'] = key;
  }

  return headers;
}
