import { prisma } from '../db/client';
import { EncounterStatus } from '@prisma/client';
import {
  FinalDiagnosisCode,
  FinalProcedureCode,
  decodeFinalDiagnosisJson,
  encodeFinalDiagnosisJson,
  decodeFinalProceduresJson,
  encodeFinalProceduresJson,
  computeCodeDiffs,
  CodeDiffs,
} from '../utils/encounterCodes';

export interface ListEncountersParams {
  practiceId: string;
  status?: EncounterStatus;
  providerId?: string;
  fromDate?: Date;
  toDate?: Date;
  limit: number;
  offset: number;
}

export interface CreateEncounterParams {
  practiceId: string;
  providerId: string;
  patientPseudoId: string;
  encounterDate: Date;
  visitType: string;
  specialty: string;
  noteText: string;
}

export interface UpdateEncounterMetadataParams {
  encounterId: string;
  practiceId: string;
  patch: {
    encounterDate?: Date;
    patientPseudoId?: string;
    visitType?: string;
    specialty?: string;
    noteText?: string;
  };
}

export interface UpdateEncounterCodesParams {
  encounterId: string;
  practiceId: string;
  finalEmCode?: string | null;
  finalEmCodeSource?: string | null;
  finalDiagnosisCodes?: FinalDiagnosisCode[] | null;
  finalProcedureCodes?: FinalProcedureCode[] | null;
}

export interface UpdateEncounterCodesResult {
  encounter: any;
  diffs: CodeDiffs;
}

export async function listEncountersForPractice(params: ListEncountersParams) {
  const { practiceId, status, providerId, fromDate, toDate, limit, offset } = params;

  const where: any = {
    practiceId,
  };

  if (status) {
    where.status = status;
  }

  if (providerId) {
    where.providerId = providerId;
  }

  if (fromDate || toDate) {
    where.encounterDate = {};
    if (fromDate) {
      where.encounterDate.gte = fromDate;
    }
    if (toDate) {
      where.encounterDate.lte = toDate;
    }
  }

  return prisma.encounter.findMany({
    where,
    select: {
      id: true,
      practiceId: true,
      providerId: true,
      patientPseudoId: true,
      encounterDate: true,
      visitType: true,
      specialty: true,
      status: true,
      aiEmSuggested: true,
      finalEmCode: true,
      denialRiskLevel: true,
      createdAt: true,
      updatedAt: true,
      provider: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: {
      encounterDate: 'desc',
    },
    take: limit,
    skip: offset,
  });
}

export async function createEncounter(params: CreateEncounterParams) {
  const { practiceId, providerId, patientPseudoId, encounterDate, visitType, specialty, noteText } =
    params;

  return prisma.encounter.create({
    data: {
      practiceId,
      providerId,
      patientPseudoId,
      encounterDate,
      visitType,
      specialty,
      noteText,
      status: EncounterStatus.draft,
    },
  });
}

export async function getEncounterForPractice(encounterId: string, practiceId: string) {
  return prisma.encounter.findFirst({
    where: {
      id: encounterId,
      practiceId,
    },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      diagnosisCodes: {
        orderBy: { index: 'asc' },
      },
      procedureCodes: {
        orderBy: { index: 'asc' },
      },
    },
  });
}

export async function updateEncounterMetadata(params: UpdateEncounterMetadataParams) {
  const { encounterId, practiceId, patch } = params;

  const updateData: any = {};
  if (patch.encounterDate !== undefined) updateData.encounterDate = patch.encounterDate;
  if (patch.patientPseudoId !== undefined) updateData.patientPseudoId = patch.patientPseudoId;
  if (patch.visitType !== undefined) updateData.visitType = patch.visitType;
  if (patch.specialty !== undefined) updateData.specialty = patch.specialty;
  if (patch.noteText !== undefined) updateData.noteText = patch.noteText;

  return prisma.encounter.update({
    where: {
      id: encounterId,
      practiceId,
    },
    data: updateData,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}

export async function updateEncounterCodes(
  params: UpdateEncounterCodesParams
): Promise<UpdateEncounterCodesResult> {
  const { encounterId, practiceId, finalEmCode, finalEmCodeSource, finalDiagnosisCodes, finalProcedureCodes } =
    params;

  // Load current encounter
  const current = await prisma.encounter.findFirst({
    where: {
      id: encounterId,
      practiceId,
    },
  });

  if (!current) {
    throw new Error('Encounter not found');
  }

  // Decode existing codes
  const prevDiag = decodeFinalDiagnosisJson(current.finalDiagnosisJson);
  const prevProc = decodeFinalProceduresJson(current.finalProceduresJson);
  const prevEmCode = current.finalEmCode;

  // Use provided codes or keep existing (convert null to empty array)
  const nextDiag: FinalDiagnosisCode[] = finalDiagnosisCodes !== undefined ? (finalDiagnosisCodes || []) : prevDiag;
  const nextProc: FinalProcedureCode[] = finalProcedureCodes !== undefined ? (finalProcedureCodes || []) : prevProc;
  const nextEmCode = finalEmCode !== undefined ? finalEmCode : prevEmCode;

  // Compute diffs
  const diffs = computeCodeDiffs({
    prevDiag,
    nextDiag,
    prevProc,
    nextProc,
    prevEmCode,
    nextEmCode,
  });

  // Update encounter
  const updateData: any = {};
  if (finalEmCode !== undefined) updateData.finalEmCode = finalEmCode;
  if (finalEmCodeSource !== undefined) updateData.finalEmCodeSource = finalEmCodeSource;
  if (finalDiagnosisCodes !== undefined) {
    updateData.finalDiagnosisJson = encodeFinalDiagnosisJson(finalDiagnosisCodes);
  }
  if (finalProcedureCodes !== undefined) {
    updateData.finalProceduresJson = encodeFinalProceduresJson(finalProcedureCodes);
  }

  const encounter = await prisma.encounter.update({
    where: {
      id: encounterId,
      practiceId,
    },
    data: updateData,
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return { encounter, diffs };
}

export async function finalizeEncounter(params: {
  encounterId: string;
  practiceId: string;
  finalizedByUserId: string;
}) {
  const { encounterId, practiceId, finalizedByUserId } = params;

  // Load encounter
  const encounter = await prisma.encounter.findFirst({
    where: {
      id: encounterId,
      practiceId,
    },
  });

  if (!encounter) {
    throw new Error('Encounter not found');
  }

  // Validate required fields
  if (!encounter.finalEmCode) {
    throw new Error('finalEmCode is required to finalize');
  }

  const diagnoses = decodeFinalDiagnosisJson(encounter.finalDiagnosisJson);
  if (diagnoses.length === 0) {
    throw new Error('At least one diagnosis code is required to finalize');
  }

  // Update encounter
  return prisma.encounter.update({
    where: {
      id: encounterId,
      practiceId,
    },
    data: {
      status: EncounterStatus.finalized,
      finalizedByUserId,
      finalizedAt: new Date(),
    },
    include: {
      provider: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });
}
