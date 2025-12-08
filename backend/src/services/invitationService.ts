import { prisma } from '../db/client';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';

export interface CreateInviteRequest {
  email: string;
  role: UserRole;
}

export interface InviteDto {
  id: string;
  email: string;
  role: UserRole;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  inviteUrl: string;
}

const INVITE_EXPIRY_DAYS = 14;

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function createInvite(
  practiceId: string,
  data: CreateInviteRequest
): Promise<InviteDto> {
  // Check if user already exists in practice
  const existingUser = await prisma.user.findFirst({
    where: {
      practiceId,
      email: data.email,
    },
  });

  if (existingUser) {
    throw new Error('User with this email already exists in this practice');
  }

  // Check for existing pending invite
  const existingInvite = await prisma.userInvite.findFirst({
    where: {
      practiceId,
      email: data.email,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  if (existingInvite) {
    throw new Error('An active invite already exists for this email');
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = await prisma.userInvite.create({
    data: {
      practiceId,
      email: data.email,
      role: data.role,
      token,
      expiresAt,
    },
  });

  const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';
  const inviteUrl = `${publicBaseUrl}/invite/${token}`;

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() || null,
    inviteUrl,
  };
}

export async function getInviteByToken(token: string) {
  const invite = await prisma.userInvite.findUnique({
    where: { token },
    include: {
      practice: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invite) {
    return null;
  }

  if (invite.acceptedAt) {
    throw new Error('This invite has already been accepted');
  }

  if (invite.expiresAt < new Date()) {
    throw new Error('This invite has expired');
  }

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    practiceName: invite.practice.name,
    practiceId: invite.practice.id,
  };
}

export async function acceptInvite(
  token: string,
  firstName: string,
  lastName: string,
  password: string
) {
  const invite = await getInviteByToken(token);

  if (!invite) {
    throw new Error('Invalid invite token');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      practiceId: invite.practiceId,
      email: invite.email,
    },
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create user
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.default.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      practiceId: invite.practiceId,
      email: invite.email,
      passwordHash,
      role: invite.role,
      firstName,
      lastName,
    },
  });

  // Mark invite as accepted
  await prisma.userInvite.update({
    where: { token },
    data: { acceptedAt: new Date() },
  });

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
}

export async function listInvites(practiceId: string) {
  const invites = await prisma.userInvite.findMany({
    where: { practiceId },
    orderBy: { createdAt: 'desc' },
  });

  const publicBaseUrl = process.env.PUBLIC_BASE_URL || 'http://localhost:5173';

  return invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt.toISOString(),
    acceptedAt: invite.acceptedAt?.toISOString() || null,
    inviteUrl: `${publicBaseUrl}/invite/${invite.token}`,
  }));
}

