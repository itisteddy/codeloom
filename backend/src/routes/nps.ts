import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { submitNpsResponse, getNpsAggregate } from '../services/npsService';

export const npsRouter = Router();

// POST /api/practice/nps - submit NPS response
npsRouter.post('/practice/nps', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { score, comment } = req.body;

    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'Missing required field: score' });
    }

    if (typeof score !== 'number' || score < 0 || score > 10) {
      return res.status(400).json({ error: 'Score must be a number between 0 and 10' });
    }

    const response = await submitNpsResponse(
      req.user!.practiceId,
      req.user!.id,
      score,
      comment
    );

    return res.status(201).json(response);
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error submitting NPS:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit NPS response' });
  }
});

// GET /api/admin/practice/nps - get NPS aggregate (admin only)
npsRouter.get(
  '/admin/practice/nps',
  requireAuth,
  requireRole(['practice_admin', 'platform_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { fromDate, toDate } = req.query;

      const fromDateObj = fromDate ? new Date(fromDate as string) : undefined;
      const toDateObj = toDate ? new Date(toDate as string) : undefined;

      if (fromDate && isNaN(fromDateObj!.getTime())) {
        return res.status(400).json({ error: 'Invalid fromDate format' });
      }
      if (toDate && isNaN(toDateObj!.getTime())) {
        return res.status(400).json({ error: 'Invalid toDate format' });
      }

      const aggregate = await getNpsAggregate(req.user!.practiceId, fromDateObj, toDateObj);
      return res.json(aggregate);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error getting NPS aggregate:', error);
      return res.status(500).json({ error: error.message || 'Failed to get NPS aggregate' });
    }
  }
);

