import { prisma } from '../db/client';

export interface PilotConfigDto {
  pilotLabel: string | null;
  pilotStartDate: string | null;
  pilotEndDate: string | null;
  enabledSpecialties: string[] | null;
  llmModeOverride: string | null;
  providerCanFinalize: boolean;
  baseline: any | null;
}

export async function getPilotConfig(practiceId: string): Promise<PilotConfigDto> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: {
      pilotLabel: true,
      pilotStartDate: true,
      pilotEndDate: true,
      enabledSpecialtiesJson: true,
      llmModeOverride: true,
      providerCanFinalize: true,
      pilotBaselineJson: true,
    },
  });

  if (!practice) {
    throw new Error('Practice not found');
  }

  const enabledSpecialties = practice.enabledSpecialtiesJson
    ? (Array.isArray(practice.enabledSpecialtiesJson)
        ? practice.enabledSpecialtiesJson
        : JSON.parse(practice.enabledSpecialtiesJson as string))
    : null;

  return {
    pilotLabel: practice.pilotLabel,
    pilotStartDate: practice.pilotStartDate?.toISOString() || null,
    pilotEndDate: practice.pilotEndDate?.toISOString() || null,
    enabledSpecialties: enabledSpecialties as string[] | null,
    llmModeOverride: practice.llmModeOverride,
    providerCanFinalize: practice.providerCanFinalize,
    baseline: practice.pilotBaselineJson || null,
  };
}

export async function updatePilotConfig(
  practiceId: string,
  updates: Partial<PilotConfigDto>
): Promise<PilotConfigDto> {
  const data: any = {};

  if (updates.pilotLabel !== undefined) {
    data.pilotLabel = updates.pilotLabel || null;
  }
  if (updates.pilotStartDate !== undefined) {
    data.pilotStartDate = updates.pilotStartDate ? new Date(updates.pilotStartDate) : null;
  }
  if (updates.pilotEndDate !== undefined) {
    data.pilotEndDate = updates.pilotEndDate ? new Date(updates.pilotEndDate) : null;
  }
  if (updates.enabledSpecialties !== undefined) {
    data.enabledSpecialtiesJson = updates.enabledSpecialties
      ? JSON.stringify(updates.enabledSpecialties)
      : null;
  }
  if (updates.llmModeOverride !== undefined) {
    data.llmModeOverride = updates.llmModeOverride || null;
  }
  if (updates.providerCanFinalize !== undefined) {
    data.providerCanFinalize = updates.providerCanFinalize;
  }
  if (updates.baseline !== undefined) {
    data.pilotBaselineJson = updates.baseline || null;
  }

  await prisma.practice.update({
    where: { id: practiceId },
    data,
  });

  return getPilotConfig(practiceId);
}

