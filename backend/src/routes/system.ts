import { Router } from 'express';
import { prisma } from '../db/client';
import { config } from '../config';
import { getMetrics } from '../middleware/metrics';

export const systemRouter = Router();

// GET /api/system/healthz - simple health check
systemRouter.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', env: config.env });
});

// GET /api/system/readyz - readiness check with DB connectivity
systemRouter.get('/readyz', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'ready', db: 'ok', env: config.env });
  } catch (e: any) {
    return res.status(503).json({ status: 'degraded', db: 'error', error: e.message });
  }
});

// GET /api/system/metrics - in-memory metrics
systemRouter.get('/metrics', (_req, res) => {
  res.json(getMetrics());
});

