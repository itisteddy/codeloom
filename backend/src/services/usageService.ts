import { prisma } from '../db/client';

function getPeriodBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export async function getOrCreateUsagePeriod(practiceId: string, now = new Date()) {
  const { start, end } = getPeriodBounds(now);
  
  let period = await prisma.usagePeriod.findFirst({
    where: {
      practiceId,
      periodStart: start,
      periodEnd: end,
    },
  });

  if (!period) {
    period = await prisma.usagePeriod.create({
      data: {
        practiceId,
        periodStart: start,
        periodEnd: end,
      },
    });
  }

  return period;
}

export async function incrementUsage(
  practiceId: string,
  field: 'encountersCreated' | 'aiSuggestCalls' | 'trainingAttempts',
  amount = 1
) {
  const period = await getOrCreateUsagePeriod(practiceId);
  
  await prisma.usagePeriod.update({
    where: { id: period.id },
    data: {
      [field]: { increment: amount },
    },
  });
}

