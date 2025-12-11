/**
 * Usage Service - Tracks practice usage for billing and analytics
 * 
 * Increments usage counters when:
 * - AI suggestions are generated for an encounter
 * - An encounter is finalized
 * - A training attempt is submitted
 */

import { prisma } from '../db/client';
import { logInfo } from '../utils/logger';

// Type for usage field keys
type UsageField = 'encountersCreated' | 'encountersWithAiSuggestions' | 'encountersFinalized' | 'aiSuggestCalls' | 'trainingAttempts' | 'activeProviders';

/**
 * Get or create the current billing period usage record for a practice
 * Current period is the calendar month (1st to last day)
 */
export async function getOrCreateCurrentPeriodUsage(practiceId: string) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  let usagePeriod = await prisma.usagePeriod.findFirst({
    where: {
      practiceId,
      periodStart: { lte: now },
      periodEnd: { gte: now },
    },
  });

  if (!usagePeriod) {
    usagePeriod = await prisma.usagePeriod.create({
      data: {
        practiceId,
        periodStart,
        periodEnd,
      },
    });
    logInfo('Created new usage period', { practiceId, periodStart: periodStart.toISOString() });
  }

  return usagePeriod;
}

/**
 * Increment the counter for encounters with AI suggestions
 */
export async function incrementEncounterWithAiSuggestion(practiceId: string): Promise<void> {
  const usage = await getOrCreateCurrentPeriodUsage(practiceId);
  
  await prisma.usagePeriod.update({
    where: { id: usage.id },
    data: {
      encountersWithAiSuggestions: { increment: 1 },
      aiSuggestCalls: { increment: 1 },
    },
  });
}

/**
 * Increment the counter for finalized encounters
 */
export async function incrementEncounterFinalized(practiceId: string): Promise<void> {
  const usage = await getOrCreateCurrentPeriodUsage(practiceId);
  
  await prisma.usagePeriod.update({
    where: { id: usage.id },
    data: {
      encountersFinalized: { increment: 1 },
    },
  });
}

/**
 * Increment the counter for training attempts
 */
export async function incrementTrainingAttempt(practiceId: string): Promise<void> {
  const usage = await getOrCreateCurrentPeriodUsage(practiceId);
  
  await prisma.usagePeriod.update({
    where: { id: usage.id },
    data: {
      trainingAttempts: { increment: 1 },
    },
  });
}

/**
 * Increment the encounter created counter
 */
export async function incrementEncounterCreated(practiceId: string): Promise<void> {
  const usage = await getOrCreateCurrentPeriodUsage(practiceId);
  
  await prisma.usagePeriod.update({
    where: { id: usage.id },
    data: {
      encountersCreated: { increment: 1 },
    },
  });
}

/**
 * Get current period usage summary for a practice
 */
export async function getCurrentUsageSummary(practiceId: string) {
  const usage = await getOrCreateCurrentPeriodUsage(practiceId);
  
  return {
    periodStart: usage.periodStart.toISOString(),
    periodEnd: usage.periodEnd.toISOString(),
    encountersCreated: usage.encountersCreated,
    encountersWithAiSuggestions: usage.encountersWithAiSuggestions,
    encountersFinalized: usage.encountersFinalized,
    aiSuggestCalls: usage.aiSuggestCalls,
    trainingAttempts: usage.trainingAttempts,
    activeProviders: usage.activeProviders,
  };
}

// ============================================
// Legacy aliases for backwards compatibility
// ============================================

/**
 * Alias for getOrCreateCurrentPeriodUsage (backwards compatibility)
 */
export const getOrCreateUsagePeriod = getOrCreateCurrentPeriodUsage;

/**
 * Generic increment function (backwards compatibility)
 */
export async function incrementUsage(practiceId: string, field: UsageField): Promise<void> {
  const usage = await getOrCreateCurrentPeriodUsage(practiceId);
  
  await prisma.usagePeriod.update({
    where: { id: usage.id },
    data: {
      [field]: { increment: 1 },
    },
  });
}
