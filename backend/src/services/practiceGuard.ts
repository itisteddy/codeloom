import { prisma } from '../db/client';

/**
 * Ensures an encounter belongs to the specified practice.
 * Returns true if the encounter exists and belongs to the practice, false otherwise.
 */
export async function ensureEncounterInPractice(
  encounterId: string,
  practiceId: string
): Promise<boolean> {
  const enc = await prisma.encounter.findFirst({
    where: { id: encounterId, practiceId },
    select: { id: true },
  });
  return !!enc;
}

/**
 * Ensures a training case exists (training cases are not practice-scoped in MVP).
 * Returns true if the case exists, false otherwise.
 */
export async function ensureTrainingCaseExists(caseId: string): Promise<boolean> {
  const case_ = await prisma.trainingCase.findUnique({
    where: { id: caseId },
    select: { id: true },
  });
  return !!case_;
}

