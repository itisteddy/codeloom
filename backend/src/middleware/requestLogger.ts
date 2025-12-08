import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const user = (req as AuthenticatedRequest).user;
    const path = req.originalUrl.split('?')[0];

    const log = {
      type: 'http_request',
      ts: new Date().toISOString(),
      method: req.method,
      path,
      status: res.statusCode,
      durationMs,
      userId: user?.id ?? null,
      practiceId: user?.practiceId ?? null,
    };

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(log));
  });

  next();
}

