import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthenticatedRequest } from './auth';

export function requireRole(allowed: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user || !allowed.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

