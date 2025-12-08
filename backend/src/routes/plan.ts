import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { prisma } from '../db/client';
import { plans, PlanKey } from '../config';
import { getOrCreateUsagePeriod } from '../services/usageService';
import { getPracticePlan } from '../services/entitlementService';

export const planRouter = Router();

// GET /api/practice/plan - get current practice plan and usage
planRouter.get('/practice/plan', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const practiceId = req.user!.practiceId;
    
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: { planKey: true },
    });

    const planKey = (practice?.planKey as PlanKey) || 'plan_a';
    const plan = plans[planKey] || plans.plan_a;
    
    const period = await getOrCreateUsagePeriod(practiceId);

    return res.json({
      planKey: plan.key,
      planName: plan.name,
      maxProviders: plan.maxProviders,
      maxEncountersPerMonth: plan.maxEncountersPerMonth,
      trainingEnabled: plan.trainingEnabled,
      analyticsEnabled: plan.analyticsEnabled,
      exportsEnabled: plan.exportsEnabled,
      currentUsage: {
        periodStart: period.periodStart.toISOString(),
        periodEnd: period.periodEnd.toISOString(),
        encountersCreated: period.encountersCreated,
        aiSuggestCalls: period.aiSuggestCalls,
        trainingAttempts: period.trainingAttempts,
      },
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting plan info:', error);
    return res.status(500).json({ error: error.message || 'Failed to get plan info' });
  }
});

// POST /api/admin/practices/:id/plan - update practice plan (admin only)
planRouter.post(
  '/admin/practices/:id/plan',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { planKey } = req.body as { planKey?: string };
      const practiceId = req.params.id;

      if (!planKey || !Object.keys(plans).includes(planKey)) {
        return res.status(400).json({
          error: `Invalid planKey. Must be one of: ${Object.keys(plans).join(', ')}`,
        });
      }

      const practice = await prisma.practice.update({
        where: { id: practiceId },
        data: {
          planKey: planKey as PlanKey,
          planSince: new Date(),
        },
      });

      return res.json({
        id: practice.id,
        planKey: practice.planKey,
        planSince: practice.planSince.toISOString(),
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Practice not found' });
      }
      // eslint-disable-next-line no-console
      console.error('Error updating practice plan:', error);
      return res.status(500).json({ error: error.message || 'Failed to update practice plan' });
    }
  }
);

