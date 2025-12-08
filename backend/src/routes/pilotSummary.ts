import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { generatePilotSummary } from '../services/pilotSummaryService';

export const pilotSummaryRouter = Router();

// GET /api/admin/pilot/summary - generate pilot summary report (admin only)
pilotSummaryRouter.get(
  '/summary',
  requireAuth,
  requireRole(['admin']),
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

      const summary = await generatePilotSummary(
        req.user!.practiceId,
        fromDateObj,
        toDateObj
      );

      return res.json(summary);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error generating pilot summary:', error);
      return res.status(500).json({ error: error.message || 'Failed to generate pilot summary' });
    }
  }
);

// GET /api/admin/pilot/summary/export - export pilot summary as JSON (admin only)
pilotSummaryRouter.get(
  '/summary/export',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { fromDate, toDate } = req.query;

      const fromDateObj = fromDate ? new Date(fromDate as string) : undefined;
      const toDateObj = toDate ? new Date(toDate as string) : undefined;

      const summary = await generatePilotSummary(
        req.user!.practiceId,
        fromDateObj,
        toDateObj
      );

      const filename = `pilot_summary_${summary.practiceName.replace(/\s+/g, '_')}_${new Date()
        .toISOString()
        .split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.json(summary);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error exporting pilot summary:', error);
      return res.status(500).json({ error: error.message || 'Failed to export pilot summary' });
    }
  }
);

