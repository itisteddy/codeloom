/**
 * Tenancy helpers for resolving current user, practice, and organization context
 * 
 * These helpers centralize tenancy logic to make future multi-practice support easier.
 * For Phase 1, they still rely on user.practiceId for backward compatibility,
 * but the structure is in place to migrate to PracticeUser join table.
 */

import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db/client';
import { User, Practice, Organization } from '@prisma/client';

/**
 * Get the current authenticated user from the request
 * Returns the full User record with relations
 */
export async function getCurrentUser(req: AuthenticatedRequest): Promise<User | null> {
  if (!req.user) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      practice: {
        include: {
          organization: true,
        },
      },
      practiceUsers: {
        include: {
          practice: {
            include: {
              organization: true,
            },
          },
        },
      },
    },
  });

  return user;
}

/**
 * Get the current practice for the authenticated user
 * 
 * Phase 1: Uses user.practiceId for backward compatibility
 * Future: Will use PracticeUser join table (user can belong to multiple practices)
 * 
 * Note: PLATFORM_ADMIN users may not have a practice and will return null
 */
export async function getCurrentPractice(req: AuthenticatedRequest): Promise<Practice | null> {
  if (!req.user) {
    return null;
  }

  // PLATFORM_ADMIN users don't have a practice context
  if (req.user.role === 'platform_admin') {
    return null;
  }

  // Phase 1: Use practiceId for backward compatibility
  if (req.user.practiceId) {
    const practice = await prisma.practice.findUnique({
      where: { id: req.user.practiceId },
      include: {
        organization: true,
      },
    });
    return practice;
  }

  // Fallback: Use first PracticeUser membership if available
  const practiceUser = await prisma.practiceUser.findFirst({
    where: { userId: req.user.id },
    include: {
      practice: {
        include: {
          organization: true,
        },
      },
    },
  });

  return practiceUser?.practice || null;
}

/**
 * Get the current organization for the authenticated user
 * Resolves via: User -> Practice -> Organization
 */
export async function getCurrentOrg(req: AuthenticatedRequest): Promise<Organization | null> {
  const practice = await getCurrentPractice(req);
  if (!practice || !practice.orgId) {
    return null;
  }

  // Fetch organization (practice should already have it loaded from getCurrentPractice)
  const org = await prisma.organization.findUnique({
    where: { id: practice.orgId },
  });

  return org;
}

/**
 * Get the practice ID for the current user
 * Helper for cases where you just need the ID
 */
export async function getCurrentPracticeId(req: AuthenticatedRequest): Promise<string | null> {
  const practice = await getCurrentPractice(req);
  return practice?.id || null;
}

/**
 * Get the organization ID for the current user
 * Helper for cases where you just need the ID
 */
export async function getCurrentOrgId(req: AuthenticatedRequest): Promise<string | null> {
  const org = await getCurrentOrg(req);
  return org?.id || null;
}

