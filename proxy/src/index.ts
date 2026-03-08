import express, { Request, Response } from 'express';
import cors from 'cors';
import proxyRouter from './routes/proxy';
import statsRouter, { buildDashboardData } from './routes/stats';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CORS - allow dashboard origin
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Api-Key', 'Anthropic-Version'],
    exposedHeaders: ['X-Cache-Hit'],
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SSE endpoint for real-time updates
app.get('/api/stream', (req: Request, res: Response) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();

  // Send initial data immediately
  try {
    const data = buildDashboardData('hour');
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (err) {
    console.error('SSE initial data error:', err);
  }

  // Push updates every 5 seconds
  const interval = setInterval(() => {
    try {
      const data = buildDashboardData('hour');
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error('SSE push error:', err);
    }
  }, 5000);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  // Clean up on disconnect
  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeat);
  });
});

// API routes (stats)
app.use('/api', statsRouter);

// Proxy routes
app.use('/v1', proxyRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Agent Cost Console proxy running on http://localhost:${PORT}`);
  console.log(`  Proxy OpenAI:    POST http://localhost:${PORT}/v1/openai/chat/completions`);
  console.log(`  Proxy Anthropic: POST http://localhost:${PORT}/v1/anthropic/messages`);
  console.log(`  Dashboard API:   GET  http://localhost:${PORT}/api/dashboard`);
  console.log(`  SSE stream:      GET  http://localhost:${PORT}/api/stream`);
});

export default app;
