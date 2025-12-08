import { prisma } from '../db/client';
import { TrainingDifficulty } from '@prisma/client';

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function isEmNear(userCode: string, correctCode: string): boolean {
  const userNormalized = normalizeCode(userCode);
  const correctNormalized = normalizeCode(correctCode);

  // Extract numeric part (e.g., "99213" from "99213")
  const userMatch = userNormalized.match(/^(\d{3})(\d{2})$/);
  const correctMatch = correctNormalized.match(/^(\d{3})(\d{2})$/);

  if (!userMatch || !correctMatch) return false;

  const userPrefix = userMatch[1];
  const userSuffix = parseInt(userMatch[2], 10);
  const correctPrefix = correctMatch[1];
  const correctSuffix = parseInt(correctMatch[2], 10);

  // Same prefix and difference <= 1
  return userPrefix === correctPrefix && Math.abs(userSuffix - correctSuffix) <= 1;
}

export async function listTrainingCases(params: {
  specialty?: string;
  difficulty?: TrainingDifficulty;
}) {
  const where: any = {};
  if (params.specialty) {
    where.specialty = params.specialty;
  }
  if (params.difficulty) {
    where.difficulty = params.difficulty;
  }

  return prisma.trainingCase.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTrainingCaseById(id: string) {
  return prisma.trainingCase.findUnique({
    where: { id },
  });
}

export interface TrainingAttemptResult {
  attemptId: string;
  caseId: string;
  userEmCode: string;
  userDiagnosisCodes: string[];
  userProcedureCodes: string[];
  correctEmCode: string;
  correctDiagnosisCodes: string[];
  correctProcedureCodes: string[];
  aiEmCode: string | null;
  aiDiagnosisCodes: string[] | null;
  aiProcedureCodes: string[] | null;
  scorePercent: number;
  matchSummary: {
    em: {
      isExact: boolean;
      isNear: boolean;
    };
    diagnoses: {
      correctCount: number;
      totalCorrect: number;
      extraCount: number;
      missingCodes: string[];
      extraCodes: string[];
    };
    procedures: {
      correctCount: number;
      totalCorrect: number;
      extraCount: number;
      missingCodes: string[];
      extraCodes: string[];
    };
  };
  createdAt: string;
}

export async function submitTrainingAttempt(params: {
  caseId: string;
  userId: string;
  userEmCode: string;
  userDiagnosisCodes: string[];
  userProcedureCodes: string[];
}): Promise<TrainingAttemptResult> {
  const { caseId, userId, userEmCode, userDiagnosisCodes, userProcedureCodes } = params;

  // Load training case
  const trainingCase = await prisma.trainingCase.findUnique({
    where: { id: caseId },
  });

  if (!trainingCase) {
    throw new Error('CASE_NOT_FOUND');
  }

  // Decode correct codes from JSON
  const correctDiagnosisCodes: string[] = Array.isArray(trainingCase.correctDiagnosisCodes)
    ? (trainingCase.correctDiagnosisCodes as string[])
    : (JSON.parse(trainingCase.correctDiagnosisCodes as string) as string[]);
  const correctProcedureCodes: string[] = Array.isArray(trainingCase.correctProcedureCodes)
    ? (trainingCase.correctProcedureCodes as string[])
    : (JSON.parse(trainingCase.correctProcedureCodes as string) as string[]);

  // Normalize codes for comparison
  const correctEmNormalized = normalizeCode(trainingCase.correctEmCode);
  const userEmNormalized = normalizeCode(userEmCode);

  // E/M scoring
  const emExact = userEmNormalized === correctEmNormalized;
  const emNear = !emExact && isEmNear(userEmCode, trainingCase.correctEmCode);

  // Diagnosis scoring
  const correctDxSet = new Set<string>(correctDiagnosisCodes.map(normalizeCode));
  const userDxSet = new Set<string>(userDiagnosisCodes.map(normalizeCode));
  const correctDxHits = new Set<string>([...userDxSet].filter((x) => correctDxSet.has(x)));
  const missingDxCodes = new Set<string>([...correctDxSet].filter((x) => !userDxSet.has(x)));
  const extraDxCodes = new Set<string>([...userDxSet].filter((x) => !correctDxSet.has(x)));

  // Procedure scoring
  const correctProcSet = new Set<string>(correctProcedureCodes.map(normalizeCode));
  const userProcSet = new Set<string>(userProcedureCodes.map(normalizeCode));
  const correctProcHits = new Set<string>([...userProcSet].filter((x) => correctProcSet.has(x)));
  const missingProcCodes = new Set<string>([...correctProcSet].filter((x) => !userProcSet.has(x)));
  const extraProcCodes = new Set<string>([...userProcSet].filter((x) => !correctProcSet.has(x)));

  // Calculate scores
  let emScore = 0;
  if (emExact) {
    emScore = 1;
  } else if (emNear) {
    emScore = 0.7;
  }

  let dxScore = 0;
  const totalCorrectDx = correctDiagnosisCodes.length;
  if (totalCorrectDx > 0) {
    dxScore = correctDxHits.size / totalCorrectDx;
  } else {
    // No correct diagnoses expected
    dxScore = userDiagnosisCodes.length === 0 ? 1 : 0;
  }

  let procScore = 0;
  const totalCorrectProc = correctProcedureCodes.length;
  if (totalCorrectProc > 0) {
    procScore = correctProcHits.size / totalCorrectProc;
  } else {
    // No correct procedures expected
    procScore = userProcedureCodes.length === 0 ? 1 : 0;
  }

  // Final score
  const score = emScore * 0.5 + dxScore * 0.3 + procScore * 0.2;
  const scorePercent = Math.round(score * 100);

  // Build match summary
  const matchSummary = {
    em: {
      isExact: emExact,
      isNear: emNear,
    },
    diagnoses: {
      correctCount: correctDxHits.size,
      totalCorrect: totalCorrectDx,
      extraCount: extraDxCodes.size,
      missingCodes: Array.from(missingDxCodes),
      extraCodes: Array.from(extraDxCodes),
    },
    procedures: {
      correctCount: correctProcHits.size,
      totalCorrect: totalCorrectProc,
      extraCount: extraProcCodes.size,
      missingCodes: Array.from(missingProcCodes),
      extraCodes: Array.from(extraProcCodes),
    },
  };

  // Create TrainingAttempt
  const attempt = await prisma.trainingAttempt.create({
    data: {
      userId,
      trainingCaseId: caseId,
      userEmCode,
      userDiagnosisCodes: JSON.stringify(userDiagnosisCodes),
      userProcedureCodes: JSON.stringify(userProcedureCodes),
      aiEmCode: null,
      aiDiagnosisCodes: null,
      aiProcedureCodes: null,
      scorePercent,
      matchSummary: matchSummary as any,
    },
  });

  // Return result DTO
  return {
    attemptId: attempt.id,
    caseId: trainingCase.id,
    userEmCode,
    userDiagnosisCodes,
    userProcedureCodes,
    correctEmCode: trainingCase.correctEmCode,
    correctDiagnosisCodes,
    correctProcedureCodes,
    aiEmCode: null,
    aiDiagnosisCodes: null,
    aiProcedureCodes: null,
    scorePercent,
    matchSummary,
    createdAt: attempt.createdAt.toISOString(),
  };
}

export async function listUserAttempts(userId: string) {
  return prisma.trainingAttempt.findMany({
    where: { userId },
    include: {
      trainingCase: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to recent 50
  });
}
