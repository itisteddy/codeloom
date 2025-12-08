import { prisma } from '../db/client';

export interface PracticeAnalyticsSummary {
  encounterCount: number;
  finalizedCount: number;
  aiSuggestedCount: number;
  aiUsageRate: number; // 0–1
  overrideRate: number; // 0–1, based on EM overrides
  avgTimeToFinalizeMinutes: number | null;
  trainingAttemptsCount: number;
  avgTrainingScorePercent: number | null;
}

export async function getPracticeAnalyticsSummary(params: {
  practiceId: string;
  fromDate: Date;
  toDate: Date;
}): Promise<PracticeAnalyticsSummary> {
  const { practiceId, fromDate, toDate } = params;

  // Get encounters in date range
  const encounters = await prisma.encounter.findMany({
    where: {
      practiceId,
      encounterDate: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      finalizedAt: true,
      aiEmSuggested: true,
      finalEmCode: true,
    },
  });

  const encounterCount = encounters.length;
  const finalizedCount = encounters.filter((e: { status: string }) => e.status === 'finalized').length;
  const aiSuggestedCount = encounters.filter(
    (e: { aiEmSuggested: string | null; status: string }) => e.aiEmSuggested !== null || e.status === 'ai_suggested'
  ).length;

  const aiUsageRate = encounterCount > 0 ? aiSuggestedCount / encounterCount : 0;

  // Calculate avgTimeToFinalizeMinutes
  const finalizedEncounters = encounters.filter((e: { finalizedAt: Date | null }) => e.finalizedAt !== null);
  let avgTimeToFinalizeMinutes: number | null = null;
  if (finalizedEncounters.length > 0) {
    const times = finalizedEncounters.map((e: { createdAt: Date; finalizedAt: Date }) => {
      const createdAt = e.createdAt.getTime();
      const finalizedAt = e.finalizedAt.getTime();
      return (finalizedAt - createdAt) / (1000 * 60); // minutes
    });
    avgTimeToFinalizeMinutes = times.reduce((sum: number, a: number) => sum + a, 0) / times.length;
  }

  // Calculate overrideRate
  const encountersWithAiEm = encounters.filter((e: { aiEmSuggested: string | null }) => e.aiEmSuggested !== null);
  const overrideDenominator = encountersWithAiEm.length;
  const overrideNumerator = encountersWithAiEm.filter(
    (e: { finalEmCode: string | null; aiEmSuggested: string | null }) => e.finalEmCode !== null && e.finalEmCode !== e.aiEmSuggested
  ).length;
  const overrideRate = overrideDenominator > 0 ? overrideNumerator / overrideDenominator : 0;

  // Get training attempts for users in this practice
  const attempts = await prisma.trainingAttempt.findMany({
    where: {
      user: {
        practiceId,
      },
      createdAt: {
        gte: fromDate,
        lte: toDate,
      },
    },
    select: {
      scorePercent: true,
    },
  });

  const trainingAttemptsCount = attempts.length;
  let avgTrainingScorePercent: number | null = null;
  if (attempts.length > 0) {
    const totalScore = attempts.reduce((sum: number, a: { scorePercent: number }) => sum + a.scorePercent, 0);
    avgTrainingScorePercent = totalScore / attempts.length;
  }

  return {
    encounterCount,
    finalizedCount,
    aiSuggestedCount,
    aiUsageRate,
    overrideRate,
    avgTimeToFinalizeMinutes,
    trainingAttemptsCount,
    avgTrainingScorePercent,
  };
}

