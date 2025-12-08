import { prisma } from '../db/client';
import { UserRole } from '@prisma/client';

export async function createUser(params: {
  practiceId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}) {
  return prisma.user.create({ data: params });
}

export async function findUserByEmail(practiceId: string, email: string) {
  return prisma.user.findFirst({
    where: { practiceId, email },
  });
}

