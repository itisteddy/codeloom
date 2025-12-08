import { prisma } from '../db/client';
import { logAuditEvent } from './auditService';
import { AuditAction, UserRole } from '@prisma/client';

export interface EncounterFeedbackDto {
  helpful: boolean;
  comment?: string | null;
}

export async function submitEncounterFeedback(
  encounterId: string,
  userId: string,
  userRole: UserRole,
  practiceId: string,
  feedback: EncounterFeedbackDto
): Promise<void> {
  const existing = await prisma.encounterFeedback.findUnique({
    where: {
      encounterId_userId: {
        encounterId,
        userId,
      },
    },
  });

  if (existing) {
    await prisma.encounterFeedback.update({
      where: {
        encounterId_userId: {
          encounterId,
          userId,
        },
      },
      data: {
        helpful: feedback.helpful,
        comment: feedback.comment || null,
      },
    });
  } else {
    await prisma.encounterFeedback.create({
      data: {
        encounterId,
        userId,
        helpful: feedback.helpful,
        comment: feedback.comment || null,
      },
    });
  }

  // Log audit event
  await logAuditEvent({
    practiceId,
    encounterId,
    userId,
    userRole,
    action: AuditAction.AI_FEEDBACK,
    payload: {
      type: 'AI_FEEDBACK',
      helpful: feedback.helpful,
    },
  });
}

export async function getEncounterFeedback(encounterId: string, userId: string) {
  return prisma.encounterFeedback.findUnique({
    where: {
      encounterId_userId: {
        encounterId,
        userId,
      },
    },
  });
}

export async function getEncounterFeedbackStats(
  practiceId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<{ total: number; helpful: number; helpfulRate: number | null }> {
  const where: any = {
    encounter: {
      practiceId,
    },
  };

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      where.createdAt.gte = fromDate;
    }
    if (toDate) {
      where.createdAt.lte = toDate;
    }
  }

  const feedbacks = await prisma.encounterFeedback.findMany({
    where,
  });

  const total = feedbacks.length;
  const helpful = feedbacks.filter((f: { helpful: boolean }) => f.helpful).length;
  const helpfulRate = total > 0 ? helpful / total : null;

  return {
    total,
    helpful,
    helpfulRate,
  };
}

