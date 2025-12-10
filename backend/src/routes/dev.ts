/**
 * Dev-only routes for testing and development
 * 
 * These endpoints are only available when APP_ENV === 'dev'
 */

import { Router, Response, NextFunction } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { config } from '../config';
import { applyPhiRetentionForPractice, applyPhiRetentionForAllPractices } from '../services/phiRetentionService';
import { logInfo } from '../utils/logger';

const router = Router();

// Middleware to ensure dev-only access
function requireDevEnv(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (config.appEnv !== 'dev') {
    return res.status(403).json({ error: 'This endpoint is only available in dev environment' });
  }
  next();
}

// Apply auth and dev checks to all routes
router.use(requireAuth);
router.use(requireDevEnv);

// POST /dev/phi-retention/apply - Manually trigger PHI retention (dev only)
router.post('/phi-retention/apply', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { practiceId } = req.body as { practiceId?: string };

    if (practiceId) {
      logInfo('Manually applying PHI retention for practice (dev)', { practiceId });
      await applyPhiRetentionForPractice(practiceId);
      res.json({ ok: true, message: `PHI retention applied for practice ${practiceId}` });
    } else {
      logInfo('Manually applying PHI retention for all practices (dev)');
      await applyPhiRetentionForAllPractices();
      res.json({ ok: true, message: 'PHI retention applied for all practices' });
    }
  } catch (err: any) {
    logInfo('Error applying PHI retention (dev)', { error: err.message });
    res.status(500).json({ error: err.message || 'Failed to apply PHI retention' });
  }
});

export default router;

