import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import {
  getPracticeConfiguration,
  updatePracticeConfiguration,
} from '../services/practiceConfigService';

export const practiceConfigRouter = Router();

// GET /api/practice/config - get practice configuration
practiceConfigRouter.get('/config', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const config = await getPracticeConfiguration(req.user!.practiceId);
    return res.json(config);
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting practice config:', error);
    return res.status(500).json({ error: error.message || 'Failed to get practice configuration' });
  }
});

// PATCH /api/practice/config - update practice configuration (admin/biller only)
practiceConfigRouter.patch(
  '/config',
  requireAuth,
  requireRole(['practice_admin', 'platform_admin', 'biller']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const updates = req.body as {
        llmMode?: string;
        enabledSpecialties?: string[];
        providerCanEditCodes?: boolean;
      };

      // Validate llmMode
      if (updates.llmMode && !['mock', 'openai', 'anthropic'].includes(updates.llmMode)) {
        return res.status(400).json({
          error: 'Invalid llmMode. Must be one of: mock, openai, anthropic',
        });
      }

      const config = await updatePracticeConfiguration(req.user!.practiceId, updates);
      return res.json(config);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error updating practice config:', error);
      return res
        .status(500)
        .json({ error: error.message || 'Failed to update practice configuration' });
    }
  }
);

