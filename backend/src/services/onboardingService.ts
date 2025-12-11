import { prisma } from '../db/client';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { initializePracticeConfiguration } from './practiceConfigService';

export interface CreatePracticeRequest {
  practiceName: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface InviteUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface OnboardingResult {
  practiceId: string;
  adminUserId: string;
}

export async function createPracticeWithAdmin(
  data: CreatePracticeRequest
): Promise<OnboardingResult> {
  // Create practice
  const practice = await prisma.practice.create({
    data: {
      name: data.practiceName,
      planKey: 'plan_a', // Default to plan_a for new practices
    },
  });

  // Initialize practice configuration
  await initializePracticeConfiguration(practice.id);

  // Create admin user
  const passwordHash = await bcrypt.hash(data.adminPassword, 10);
  const admin = await prisma.user.create({
    data: {
      practiceId: practice.id,
      email: data.adminEmail,
      passwordHash,
      role: UserRole.practice_admin,
      firstName: data.adminFirstName,
      lastName: data.adminLastName,
    },
  });

  return {
    practiceId: practice.id,
    adminUserId: admin.id,
  };
}

export async function inviteUserToPractice(
  practiceId: string,
  data: InviteUserRequest
): Promise<{ userId: string }> {
  // Check if user already exists in this practice
  const existing = await prisma.user.findFirst({
    where: {
      practiceId,
      email: data.email,
    },
  });

  if (existing) {
    throw new Error('User with this email already exists in this practice');
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      practiceId,
      email: data.email,
      passwordHash,
      role: data.role,
      firstName: data.firstName,
      lastName: data.lastName,
    },
  });

  return { userId: user.id };
}

