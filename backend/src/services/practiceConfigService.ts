import { prisma } from '../db/client';

export interface PracticeConfigDto {
  llmMode: string;
  enabledSpecialties: string[];
  providerCanEditCodes: boolean;
}

export async function getPracticeConfiguration(practiceId: string): Promise<PracticeConfigDto> {
  const config = await prisma.practiceConfiguration.findUnique({
    where: { practiceId },
  });

  if (!config) {
    // Return defaults
    return {
      llmMode: 'mock',
      enabledSpecialties: [],
      providerCanEditCodes: false,
    };
  }

  const enabledSpecialties = Array.isArray(config.enabledSpecialties)
    ? config.enabledSpecialties
    : JSON.parse(config.enabledSpecialties as string);

  return {
    llmMode: config.llmMode,
    enabledSpecialties: enabledSpecialties as string[],
    providerCanEditCodes: config.providerCanEditCodes,
  };
}

export async function updatePracticeConfiguration(
  practiceId: string,
  updates: Partial<PracticeConfigDto>
): Promise<PracticeConfigDto> {
  const existing = await prisma.practiceConfiguration.findUnique({
    where: { practiceId },
  });

  const data: any = {};
  if (updates.llmMode !== undefined) {
    data.llmMode = updates.llmMode;
  }
  if (updates.enabledSpecialties !== undefined) {
    data.enabledSpecialties = JSON.stringify(updates.enabledSpecialties);
  }
  if (updates.providerCanEditCodes !== undefined) {
    data.providerCanEditCodes = updates.providerCanEditCodes;
  }

  const config = existing
    ? await prisma.practiceConfiguration.update({
        where: { practiceId },
        data,
      })
    : await prisma.practiceConfiguration.create({
        data: {
          practiceId,
          llmMode: updates.llmMode || 'mock',
          enabledSpecialties: JSON.stringify(updates.enabledSpecialties || []),
          providerCanEditCodes: updates.providerCanEditCodes || false,
        },
      });

  const enabledSpecialties = Array.isArray(config.enabledSpecialties)
    ? config.enabledSpecialties
    : JSON.parse(config.enabledSpecialties as string);

  return {
    llmMode: config.llmMode,
    enabledSpecialties: enabledSpecialties as string[],
    providerCanEditCodes: config.providerCanEditCodes,
  };
}

export async function initializePracticeConfiguration(practiceId: string): Promise<void> {
  const existing = await prisma.practiceConfiguration.findUnique({
    where: { practiceId },
  });

  if (!existing) {
    await prisma.practiceConfiguration.create({
      data: {
        practiceId,
        llmMode: 'mock',
        enabledSpecialties: JSON.stringify(['primary_care']),
        providerCanEditCodes: false,
      },
    });
  }
}

