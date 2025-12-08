import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { getPracticeAnalyticsSummary } from '../services/analyticsService';
import { ensureAnalyticsAllowed } from '../services/entitlementService';

export const analyticsRouter = Router();

// GET /api/analytics/summary (biller/admin only)
analyticsRouter.get('/summary', requireAuth, requireRole(['biller', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    // Check entitlement
    try {
      await ensureAnalyticsAllowed(req.user!.practiceId);
    } catch (err: any) {
      if (err.code === 'PLAN_NO_ANALYTICS') {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }

    const { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    const fromDateObj = new Date(fromDate as string);
    const toDateObj = new Date(toDate as string);

    if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const summary = await getPracticeAnalyticsSummary({
      practiceId: req.user!.practiceId,
      fromDate: fromDateObj,
      toDate: toDateObj,
    });

    return res.json(summary);
  } catch (error: any) {
    if (error.code === 'PLAN_NO_ANALYTICS') {
      return res.status(403).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Failed to get analytics summary' });
  }
});

