import { prisma } from '../db/client';
import { AuditAction, UserRole } from '@prisma/client';

/**
 * Safe audit payload types that never include PHI (noteText, patientPseudoId, etc.)
 */
export type SafeAuditPayload =
  | { field: 'finalEmCode'; from?: string | null; to?: string | null }
  | { field: 'diagnosisCodes'; added: string[]; removed: string[] }
  | { field: 'procedureCodes'; added: string[]; removed: string[] }
  | { field: 'status'; from: string; to: string }
  | { type: 'AI_SUGGESTION'; hasEm: boolean; dxCount: number; procCount: number; modelId?: string }
  | { type: 'TRAINING_ATTEMPT'; scorePercent: number }
  | { type: 'SECURITY_EVENT'; event: 'LOGIN' | 'FAILED_LOGIN' | 'LOGOUT'; ip?: string }
  | { type: 'ENCOUNTER_CREATED' | 'ENCOUNTER_UPDATED'; metadataOnly: true }
  | { type: 'AI_SAFETY'; filteredCodesCount: number; hadInvalidCodes: boolean; hadFormatIssues: boolean; modelId: string }
  | { type: 'AI_FEEDBACK'; helpful: boolean };

export async function logAuditEvent(params: {
  practiceId: string;
  encounterId: string;
  userId: string;
  userRole: UserRole;
  action: AuditAction;
  payload?: SafeAuditPayload | null;
}) {
  return prisma.auditEvent.create({
    data: {
      practiceId: params.practiceId,
      encounterId: params.encounterId,
      userId: params.userId,
      userRole: params.userRole,
      action: params.action,
      payload: params.payload || {},
    },
  });
}

