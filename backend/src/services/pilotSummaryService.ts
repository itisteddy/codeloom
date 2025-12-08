import { prisma } from '../db/client';
import { getPracticePlan } from './entitlementService';
import { getOrCreateUsagePeriod } from './usageService';
import { getEncounterFeedbackStats } from './feedbackService';
import { getNpsAggregate } from './npsService';
import { getPracticeAnalyticsSummary } from './analyticsService';

export interface PilotSummaryDto {
  practiceName: string;
  pilotLabel?: string | null;
  periodStart: string;
  periodEnd: string;
  planKey: string;
  usage: {
    encountersCreated: number;
    aiSuggestCalls: number;
    trainingAttempts: number;
  };
  analytics: {
    encounterCount: number;
    finalizedCount: number;
    aiUsageRate: number;
    overrideRate: number;
    avgTimeToFinalizeMinutes: number | null;
    avgTrainingScorePercent: number | null;
  };
  feedback: {
    encounterFeedbackCount: number;
    helpfulRate: number | null;
  };
  nps: {
    responseCount: number;
    avgScore: number | null;
  };
  baseline?: {
    avgTimePerClaimMinutes?: number;
    denialRatePercent?: number;
  };
}

export async function generatePilotSummary(
  practiceId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<PilotSummaryDto> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
  });

  if (!practice) {
    throw new Error('Practice not found');
  }

  // Use provided dates, or practice pilot dates, or current period
  let periodStart: Date;
  let periodEnd: Date;

  if (fromDate && toDate) {
    periodStart = fromDate;
    periodEnd = toDate;
  } else if (practice.pilotStartDate) {
    periodStart = practice.pilotStartDate;
    periodEnd = practice.pilotEndDate || new Date();
  } else {
    const period = await getOrCreateUsagePeriod(practiceId);
    periodStart = period.periodStart;
    periodEnd = period.periodEnd;
  }

  // Get analytics summary
  const analytics = await getPracticeAnalyticsSummary({
    practiceId,
    fromDate: periodStart,
    toDate: periodEnd,
  });

  // Get usage period
  const usagePeriod = await getOrCreateUsagePeriod(practiceId);

  // Get encounter feedback stats
  const feedbackStats = await getEncounterFeedbackStats(practiceId, periodStart, periodEnd);

  // Get NPS aggregate
  const npsAggregate = await getNpsAggregate(practiceId, periodStart, periodEnd);

  // Parse baseline if present
  let baseline: any = null;
  if (practice.pilotBaselineJson) {
    baseline = practice.pilotBaselineJson;
  }

  return {
    practiceName: practice.name,
    pilotLabel: practice.pilotLabel,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    planKey: practice.planKey,
    usage: {
      encountersCreated: analytics.encounterCount,
      aiSuggestCalls: usagePeriod.aiSuggestCalls,
      trainingAttempts: usagePeriod.trainingAttempts,
    },
    analytics: {
      encounterCount: analytics.encounterCount,
      finalizedCount: analytics.finalizedCount,
      aiUsageRate: analytics.aiUsageRate,
      overrideRate: analytics.overrideRate,
      avgTimeToFinalizeMinutes: analytics.avgTimeToFinalizeMinutes,
      avgTrainingScorePercent: analytics.avgTrainingScorePercent,
    },
    feedback: {
      encounterFeedbackCount: feedbackStats.total,
      helpfulRate: feedbackStats.helpfulRate,
    },
    nps: {
      responseCount: npsAggregate.responseCount,
      avgScore: npsAggregate.avgScore,
    },
    baseline: baseline || undefined,
  };
}
