import { Request, Response, NextFunction } from 'express';

const metrics = {
  totalRequests: 0,
  total5xx: 0,
  perRoute5xx: {} as Record<string, number>,
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  metrics.totalRequests += 1;
  const path = req.originalUrl.split('?')[0];

  res.on('finish', () => {
    if (res.statusCode >= 500) {
      metrics.total5xx += 1;
      metrics.perRoute5xx[path] = (metrics.perRoute5xx[path] || 0) + 1;
    }
  });

  next();
}

export function getMetrics() {
  return {
    ...metrics,
    perRoute5xx: { ...metrics.perRoute5xx },
  };
}

