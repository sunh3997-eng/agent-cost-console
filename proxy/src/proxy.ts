import crypto from 'crypto';
import fetch from 'node-fetch';
import { semanticCache } from './cache';
import { insertLog } from './db';
import { calculateCost } from './utils/cost';

interface ProxyParams {
  provider: 'openai' | 'anthropic';
  endpoint: string;
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

interface ProxyResult {
  response: unknown;
  statusCode: number;
  cacheHit: boolean;
}

interface OpenAIUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
}

interface AnthropicUsage {
  input_tokens?: number;
  output_tokens?: number;
}

interface OpenAIResponse {
  model?: string;
  usage?: OpenAIUsage;
  [key: string]: unknown;
}

interface AnthropicResponse {
  model?: string;
  usage?: AnthropicUsage;
  [key: string]: unknown;
}

function extractPromptText(
  provider: 'openai' | 'anthropic',
  body: Record<string, unknown>
): string {
  try {
    const messages = body.messages as Array<{ role: string; content: unknown }> | undefined;
    if (!messages || !Array.isArray(messages)) return '';

    if (provider === 'openai') {
      return messages
        .map(m => {
          if (typeof m.content === 'string') return m.content;
          if (Array.isArray(m.content)) {
            return (m.content as Array<{ type: string; text?: string }>)
              .map(c => c.text || '')
              .join(' ');
          }
          return '';
        })
        .join(' ');
    } else {
      // Anthropic
      const systemText = typeof body.system === 'string' ? body.system : '';
      const msgText = messages
        .map(m => {
          if (typeof m.content === 'string') return m.content;
          if (Array.isArray(m.content)) {
            return (m.content as Array<{ type: string; text?: string }>)
              .map(c => c.text || '')
              .join(' ');
          }
          return '';
        })
        .join(' ');
      return [systemText, msgText].filter(Boolean).join(' ');
    }
  } catch {
    return '';
  }
}

function hashRequest(body: Record<string, unknown>): string {
  const str = JSON.stringify(body);
  return crypto.createHash('sha256').update(str).digest('hex').slice(0, 16);
}

function extractTokenUsage(
  provider: 'openai' | 'anthropic',
  responseBody: unknown
): { promptTokens: number; completionTokens: number; model: string } {
  const defaultResult = { promptTokens: 0, completionTokens: 0, model: 'unknown' };

  try {
    if (provider === 'openai') {
      const res = responseBody as OpenAIResponse;
      return {
        promptTokens: res.usage?.prompt_tokens ?? 0,
        completionTokens: res.usage?.completion_tokens ?? 0,
        model: typeof res.model === 'string' ? res.model : 'unknown',
      };
    } else {
      const res = responseBody as AnthropicResponse;
      return {
        promptTokens: res.usage?.input_tokens ?? 0,
        completionTokens: res.usage?.output_tokens ?? 0,
        model: typeof res.model === 'string' ? res.model : 'unknown',
      };
    }
  } catch {
    return defaultResult;
  }
}

export async function proxyRequest(params: ProxyParams): Promise<ProxyResult> {
  const { provider, endpoint, body, headers } = params;
  const startTime = Date.now();

  const promptText = extractPromptText(provider, body);
  const requestHash = hashRequest(body);
  const modelFromBody = typeof body.model === 'string' ? body.model : 'unknown';

  // Check semantic cache
  const cacheResult = semanticCache.get(promptText);
  if (cacheResult.hit && cacheResult.response) {
    const duration = Date.now() - startTime;
    const { promptTokens, completionTokens, model } = extractTokenUsage(
      provider,
      cacheResult.response
    );
    const cost = calculateCost(model || modelFromBody, promptTokens, completionTokens);

    insertLog.run({
      provider,
      model: model || modelFromBody,
      endpoint,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
      cost_usd: cost,
      duration_ms: duration,
      cache_hit: 1,
      request_hash: requestHash,
      status_code: 200,
    });

    return { response: cacheResult.response, statusCode: 200, cacheHit: true };
  }

  // Forward to upstream API
  const baseUrl =
    provider === 'openai'
      ? 'https://api.openai.com'
      : 'https://api.anthropic.com';

  const upstreamUrl = `${baseUrl}${endpoint}`;

  // Build request headers - pass through auth and content-type
  const forwardHeaders: Record<string, string> = {
    'content-type': 'application/json',
  };

  // Pass through authorization headers
  if (headers['authorization']) {
    forwardHeaders['authorization'] = headers['authorization'];
  }
  if (headers['x-api-key']) {
    forwardHeaders['x-api-key'] = headers['x-api-key'];
  }
  if (headers['anthropic-version']) {
    forwardHeaders['anthropic-version'] = headers['anthropic-version'];
  } else if (provider === 'anthropic') {
    forwardHeaders['anthropic-version'] = '2023-06-01';
  }

  let statusCode = 200;
  let responseBody: unknown;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: forwardHeaders,
      body: JSON.stringify(body),
    });

    statusCode = upstream.status;
    responseBody = await upstream.json();
  } catch (err) {
    const duration = Date.now() - startTime;
    insertLog.run({
      provider,
      model: modelFromBody,
      endpoint,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      cost_usd: 0,
      duration_ms: duration,
      cache_hit: 0,
      request_hash: requestHash,
      status_code: 502,
    });
    throw err;
  }

  const duration = Date.now() - startTime;
  const { promptTokens, completionTokens, model } = extractTokenUsage(
    provider,
    responseBody
  );
  const cost = calculateCost(model || modelFromBody, promptTokens, completionTokens);

  insertLog.run({
    provider,
    model: model || modelFromBody,
    endpoint,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
    cost_usd: cost,
    duration_ms: duration,
    cache_hit: 0,
    request_hash: requestHash,
    status_code: statusCode,
  });

  // Cache successful responses
  if (statusCode === 200 && promptText) {
    semanticCache.set(promptText, requestHash, responseBody);
  }

  return { response: responseBody, statusCode, cacheHit: false };
}
