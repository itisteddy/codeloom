import { prisma } from '../db/client';
import { getLLMClient, getModelId } from '../llm';
import { TrainingCase } from '@prisma/client';
import { config } from '../config';

export interface ModelEvalResult {
  modelId: string;
  caseCount: number;
  emExactRate: number;
  emNearRate: number;
  dxRecall: number;
  procRecall: number;
  avgScorePercent: number;
}

// E/M code levels for "near" matching
const EM_LEVELS: Record<string, number> = {
  '99211': 1,
  '99212': 2,
  '99213': 3,
  '99214': 4,
  '99215': 5,
};

function getEmLevel(code: string | null): number | null {
  if (!code) return null;
  return EM_LEVELS[code] || null;
}

function isEmNear(userCode: string | null, correctCode: string | null): boolean {
  const userLevel = getEmLevel(userCode);
  const correctLevel = getEmLevel(correctCode);
  if (userLevel === null || correctLevel === null) return false;
  return Math.abs(userLevel - correctLevel) <= 1;
}

function computeScoreForCase(
  userEmCode: string | null,
  userDxCodes: string[],
  userProcCodes: string[],
  correctEmCode: string,
  correctDxCodes: string[],
  correctProcCodes: string[]
): {
  emExact: boolean;
  emNear: boolean;
  dxScore: number;
  procScore: number;
  scorePercent: number;
} {
  // E/M scoring
  const emExact = userEmCode === correctEmCode;
  const emNear = isEmNear(userEmCode, correctEmCode);

  // Diagnosis scoring
  const userDxSet = new Set(userDxCodes);
  const correctDxSet = new Set(correctDxCodes);
  const dxCorrect = [...correctDxSet].filter((c) => userDxSet.has(c)).length;
  const dxScore = correctDxCodes.length > 0 ? dxCorrect / correctDxCodes.length : 1.0;

  // Procedure scoring
  const userProcSet = new Set(userProcCodes);
  const correctProcSet = new Set(correctProcCodes);
  const procCorrect = [...correctProcSet].filter((c) => userProcSet.has(c)).length;
  const procScore = correctProcCodes.length > 0 ? procCorrect / correctProcCodes.length : 1.0;

  // Combined score (weighted: EM 40%, Dx 40%, Proc 20%)
  const emScore = emExact ? 1.0 : emNear ? 0.5 : 0.0;
  const scorePercent = emScore * 0.4 + dxScore * 0.4 + procScore * 0.2;

  return {
    emExact,
    emNear,
    dxScore,
    procScore,
    scorePercent: scorePercent * 100,
  };
}

export async function evaluateModelOnTrainingCases(params: {
  modelId: string;
  limit?: number;
}): Promise<ModelEvalResult> {
  const { modelId, limit = 50 } = params;

  // Fetch training cases
  const cases = await prisma.trainingCase.findMany({
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  if (cases.length === 0) {
    return {
      modelId,
      caseCount: 0,
      emExactRate: 0,
      emNearRate: 0,
      dxRecall: 0,
      procRecall: 0,
      avgScorePercent: 0,
    };
  }

  const llmClient = getLLMClient();
  const results: Array<{
    emExact: boolean;
    emNear: boolean;
    dxScore: number;
    procScore: number;
    scorePercent: number;
  }> = [];

  // Evaluate each case
  for (const case_ of cases) {
    try {
      // Call LLM
      const suggestions = await llmClient.generateEncounterSuggestions({
        noteText: case_.noteText,
        visitType: 'office_established', // Default - could be added to TrainingCase later
        specialty: case_.specialty,
      });

      // Extract codes from suggestions
      const userEmCode = suggestions.emSuggested || null;
      const userDxCodes = suggestions.diagnoses.map((d) => d.code);
      const userProcCodes = suggestions.procedures.map((p) => p.code);

      // Parse correct codes from JSON
      const correctDxCodes = Array.isArray(case_.correctDiagnosisCodes)
        ? case_.correctDiagnosisCodes
        : JSON.parse(case_.correctDiagnosisCodes as string);
      const correctProcCodes = Array.isArray(case_.correctProcedureCodes)
        ? case_.correctProcedureCodes
        : JSON.parse(case_.correctProcedureCodes as string);

      // Compute score
      const score = computeScoreForCase(
        userEmCode,
        userDxCodes,
        userProcCodes,
        case_.correctEmCode,
        correctDxCodes,
        correctProcCodes
      );

      results.push(score);
    } catch (error) {
      // If LLM fails for a case, skip it (or count as 0 score)
      // eslint-disable-next-line no-console
      console.error(`Failed to evaluate case ${case_.id}:`, error);
      results.push({
        emExact: false,
        emNear: false,
        dxScore: 0,
        procScore: 0,
        scorePercent: 0,
      });
    }
  }

  // Aggregate metrics
  const caseCount = results.length;
  const emExactCount = results.filter((r) => r.emExact).length;
  const emNearCount = results.filter((r) => r.emNear).length;
  const avgDxScore = results.reduce((sum, r) => sum + r.dxScore, 0) / caseCount;
  const avgProcScore = results.reduce((sum, r) => sum + r.procScore, 0) / caseCount;
  const avgScorePercent = results.reduce((sum, r) => sum + r.scorePercent, 0) / caseCount;

  return {
    modelId,
    caseCount,
    emExactRate: emExactCount / caseCount,
    emNearRate: emNearCount / caseCount,
    dxRecall: avgDxScore,
    procRecall: avgProcScore,
    avgScorePercent,
  };
}

export async function evaluateProfilesOnTrainingCases(params: {
  profiles: string[];
  limit?: number;
}): Promise<ModelEvalResult[]> {
  const limit = params.limit ?? 50;
  const profiles = params.profiles.length ? params.profiles : ['default'];

  const cases = await prisma.trainingCase.findMany({
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  if (cases.length === 0) {
    return profiles.map((profile) => {
      const modelId = `${config.llm.mode}:${config.llm.openaiModel || 'mock'}:${profile}`;
      return {
        modelId,
        caseCount: 0,
        emExactRate: 0,
        emNearRate: 0,
        dxRecall: 0,
        procRecall: 0,
        avgScorePercent: 0,
      };
    });
  }

  const results: ModelEvalResult[] = [];

  // For now, we use the current LLM configuration for all profiles.
  // In the future, profile can select a different prompt or model.
  const llmClient = getLLMClient();

  for (const profile of profiles) {
    const evalResults: Array<{
      emExact: boolean;
      emNear: boolean;
      dxScore: number;
      procScore: number;
      scorePercent: number;
    }> = [];

    // Evaluate each case
    for (const case_ of cases) {
      try {
        // Call LLM
        const suggestions = await llmClient.generateEncounterSuggestions({
          noteText: case_.noteText,
          visitType: 'office_established',
          specialty: case_.specialty,
        });

        // Extract codes from suggestions (after safety validation)
        const userEmCode = suggestions.emSuggested || null;
        const userDxCodes = suggestions.diagnoses.map((d) => d.code);
        const userProcCodes = suggestions.procedures.map((p) => p.code);

        // Parse correct codes from JSON
        const correctDxCodes = Array.isArray(case_.correctDiagnosisCodes)
          ? case_.correctDiagnosisCodes
          : JSON.parse(case_.correctDiagnosisCodes as string);
        const correctProcCodes = Array.isArray(case_.correctProcedureCodes)
          ? case_.correctProcedureCodes
          : JSON.parse(case_.correctProcedureCodes as string);

        // Compute score
        const score = computeScoreForCase(
          userEmCode,
          userDxCodes,
          userProcCodes,
          case_.correctEmCode,
          correctDxCodes,
          correctProcCodes
        );

        evalResults.push(score);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to evaluate case ${case_.id} for profile ${profile}:`, error);
        evalResults.push({
          emExact: false,
          emNear: false,
          dxScore: 0,
          procScore: 0,
          scorePercent: 0,
        });
      }
    }

    // Aggregate metrics
    const caseCount = evalResults.length;
    const emExactCount = evalResults.filter((r) => r.emExact).length;
    const emNearCount = evalResults.filter((r) => r.emNear).length;
    const avgDxScore = evalResults.reduce((sum, r) => sum + r.dxScore, 0) / caseCount;
    const avgProcScore = evalResults.reduce((sum, r) => sum + r.procScore, 0) / caseCount;
    const avgScorePercent = evalResults.reduce((sum, r) => sum + r.scorePercent, 0) / caseCount;

    const modelId = `${config.llm.mode}:${config.llm.openaiModel || 'mock'}:${profile}`;

    // Persist evaluation run
    await prisma.llmEvaluationRun.create({
      data: {
        modelId,
        caseCount,
        emExactRate: emExactCount / caseCount,
        emNearRate: emNearCount / caseCount,
        dxRecall: avgDxScore,
        procRecall: avgProcScore,
        avgScorePercent,
        detailsJson: {},
      },
    });

    results.push({
      modelId,
      caseCount,
      emExactRate: emExactCount / caseCount,
      emNearRate: emNearCount / caseCount,
      dxRecall: avgDxScore,
      procRecall: avgProcScore,
      avgScorePercent,
    });
  }

  return results;
}

