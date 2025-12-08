import { prisma } from '../db/client';

export interface NpsResponseDto {
  id: string;
  userId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface NpsAggregateDto {
  responseCount: number;
  avgScore: number | null;
  latestComments: Array<{
    score: number;
    comment: string | null;
    createdAt: string;
  }>;
}

export async function submitNpsResponse(
  practiceId: string,
  userId: string,
  score: number,
  comment?: string
): Promise<NpsResponseDto> {
  if (score < 0 || score > 10) {
    throw new Error('NPS score must be between 0 and 10');
  }

  const response = await prisma.practiceNpsResponse.create({
    data: {
      practiceId,
      userId,
      score,
      comment: comment || null,
    },
  });

  return {
    id: response.id,
    userId: response.userId,
    score: response.score,
    comment: response.comment,
    createdAt: response.createdAt.toISOString(),
  };
}

export async function getNpsAggregate(
  practiceId: string,
  fromDate?: Date,
  toDate?: Date
): Promise<NpsAggregateDto> {
  const where: any = { practiceId };

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      where.createdAt.gte = fromDate;
    }
    if (toDate) {
      where.createdAt.lte = toDate;
    }
  }

  const responses = await prisma.practiceNpsResponse.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const responseCount = responses.length;
  const avgScore =
    responseCount > 0 ? responses.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / responseCount : null;

  const latestComments = responses
    .slice(0, 10)
    .map((r: { score: number; comment: string | null }) => ({
      score: r.score,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }));

  return {
    responseCount,
    avgScore,
    latestComments,
  };
}

