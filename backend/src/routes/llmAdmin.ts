import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { evaluateModelOnTrainingCases, evaluateProfilesOnTrainingCases } from '../services/llmEvaluationService';
import { getModelId } from '../llm';
import { prisma } from '../db/client';

export const llmAdminRouter = Router();

// POST /api/admin/llm/evaluate - evaluate LLM model on training cases (admin only)
llmAdminRouter.post(
  '/evaluate',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { limit } = req.body as { limit?: number };
      const modelId = getModelId();

      const result = await evaluateModelOnTrainingCases({
        modelId,
        limit: limit || 50,
      });

      return res.json(result);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error evaluating model:', error);
      return res.status(500).json({ error: error.message || 'Failed to evaluate model' });
    }
  }
);

// POST /api/admin/llm/evaluate-profiles - evaluate multiple profiles (admin only)
llmAdminRouter.post(
  '/evaluate-profiles',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { profiles, limit } = req.body as { profiles?: string[]; limit?: number };
      const defaultProfiles = profiles && profiles.length > 0 ? profiles : [getModelId()];

      const results = await evaluateProfilesOnTrainingCases({
        profiles: defaultProfiles,
        limit: limit || 50,
      });

      return res.json(results);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error evaluating profiles:', error);
      return res.status(500).json({ error: error.message || 'Failed to evaluate profiles' });
    }
  }
);

// GET /api/admin/llm/evals - list evaluation runs (admin only)
llmAdminRouter.get(
  '/evals',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt((req.query.limit as string) || '20', 10);

      const evals = await prisma.llmEvaluationRun.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          createdAt: true,
          modelId: true,
          caseCount: true,
          emExactRate: true,
          emNearRate: true,
          dxRecall: true,
          procRecall: true,
          avgScorePercent: true,
        },
      });

      return res.json(evals);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error listing evaluations:', error);
      return res.status(500).json({ error: error.message || 'Failed to list evaluations' });
    }
  }
);

