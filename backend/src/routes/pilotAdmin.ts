import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { getPilotConfig, updatePilotConfig } from '../services/pilotConfigService';

export const pilotAdminRouter = Router();

// GET /api/admin/pilot/config - get pilot config (admin only)
pilotAdminRouter.get(
  '/config',
  requireAuth,
  requireRole(['practice_admin', 'platform_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const config = await getPilotConfig(req.user!.practiceId);
      return res.json(config);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error getting pilot config:', error);
      return res.status(500).json({ error: error.message || 'Failed to get pilot config' });
    }
  }
);

// POST /api/admin/pilot/config - update pilot config (admin only)
pilotAdminRouter.post(
  '/config',
  requireAuth,
  requireRole(['practice_admin', 'platform_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const updates = req.body as {
        pilotLabel?: string;
        pilotStartDate?: string;
        pilotEndDate?: string;
        enabledSpecialties?: string[];
        llmModeOverride?: 'mock' | 'openai' | null;
        providerCanFinalize?: boolean;
      };

      // Validate llmModeOverride if provided
      if (
        updates.llmModeOverride !== undefined &&
        updates.llmModeOverride !== null &&
        !['mock', 'openai'].includes(updates.llmModeOverride)
      ) {
        return res.status(400).json({
          error: 'Invalid llmModeOverride. Must be "mock", "openai", or null',
        });
      }

      const config = await updatePilotConfig(req.user!.practiceId, updates);
      return res.json(config);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error updating pilot config:', error);
      return res.status(500).json({ error: error.message || 'Failed to update pilot config' });
    }
  }
);

// POST /api/admin/pilot/baseline - set baseline metrics (admin only)
pilotAdminRouter.post(
  '/baseline',
  requireAuth,
  requireRole(['practice_admin', 'platform_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const baseline = req.body;

      const config = await updatePilotConfig(req.user!.practiceId, { baseline });
      return res.json({ baseline: config.baseline });
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error setting baseline:', error);
      return res.status(500).json({ error: error.message || 'Failed to set baseline' });
    }
  }
);

