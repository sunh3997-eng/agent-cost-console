import { Router, Request, Response } from 'express';
import { proxyRequest } from '../proxy';

const router = Router();

// POST /v1/openai/* - proxy to OpenAI
router.post('/openai/*', async (req: Request, res: Response) => {
  // Strip /v1/openai prefix, keep the rest
  const endpoint = req.path.replace(/^\/openai/, '') || '/v1/chat/completions';
  const fullEndpoint = endpoint.startsWith('/v1') ? endpoint : `/v1${endpoint}`;

  try {
    const { response, statusCode, cacheHit } = await proxyRequest({
      provider: 'openai',
      endpoint: fullEndpoint,
      body: req.body,
      headers: req.headers as Record<string, string>,
    });

    res.set('X-Cache-Hit', cacheHit ? 'true' : 'false');
    res.status(statusCode).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    res.status(502).json({ error: { message, type: 'proxy_error' } });
  }
});

// POST /v1/anthropic/* - proxy to Anthropic
router.post('/anthropic/*', async (req: Request, res: Response) => {
  // Strip /v1/anthropic prefix
  const endpoint = req.path.replace(/^\/anthropic/, '') || '/v1/messages';
  const fullEndpoint = endpoint.startsWith('/v1') ? endpoint : `/v1${endpoint}`;

  try {
    const { response, statusCode, cacheHit } = await proxyRequest({
      provider: 'anthropic',
      endpoint: fullEndpoint,
      body: req.body,
      headers: req.headers as Record<string, string>,
    });

    res.set('X-Cache-Hit', cacheHit ? 'true' : 'false');
    res.status(statusCode).json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upstream request failed';
    res.status(502).json({ error: { message, type: 'proxy_error' } });
  }
});

export default router;
