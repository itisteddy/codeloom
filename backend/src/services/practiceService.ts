import { prisma } from '../db/client';

export async function getPracticeById(id: string) {
  return prisma.practice.findUnique({ where: { id } });
}

