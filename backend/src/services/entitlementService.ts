import { plans, PlanKey } from '../config';
import { prisma } from '../db/client';
import { getOrCreateUsagePeriod } from './usageService';

export async function getPracticePlan(practiceId: string) {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { planKey: true },
  });

  const planKey = (practice?.planKey as PlanKey) || 'plan_a';
  const plan = plans[planKey] || plans.plan_a;
  
  return plan;
}

export async function ensureEncounterCreationAllowed(practiceId: string) {
  const plan = await getPracticePlan(practiceId);
  const period = await getOrCreateUsagePeriod(practiceId);
  
  if (period.encountersCreated >= plan.maxEncountersPerMonth) {
    const err: any = new Error('Encounter limit reached for current billing period');
    err.code = 'PLAN_LIMIT_ENCOUNTERS';
    throw err;
  }
}

export async function ensureTrainingAllowed(practiceId: string) {
  const plan = await getPracticePlan(practiceId);
  
  if (!plan.trainingEnabled) {
    const err: any = new Error('Training feature is not enabled for this plan');
    err.code = 'PLAN_NO_TRAINING';
    throw err;
  }
}

export async function ensureAnalyticsAllowed(practiceId: string) {
  const plan = await getPracticePlan(practiceId);
  
  if (!plan.analyticsEnabled) {
    const err: any = new Error('Analytics is not enabled for this plan');
    err.code = 'PLAN_NO_ANALYTICS';
    throw err;
  }
}

export async function ensureExportsAllowed(practiceId: string) {
  const plan = await getPracticePlan(practiceId);
  
  if (!plan.exportsEnabled) {
    const err: any = new Error('Exports are not enabled for this plan');
    err.code = 'PLAN_NO_EXPORTS';
    throw err;
  }
}

