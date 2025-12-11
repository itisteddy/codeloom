/**
 * Tenancy Service - Tenant provisioning and management
 * 
 * Provides reusable functions for creating Organizations, Practices, Subscriptions,
 * and Users in a consistent, idempotent way.
 */

import { prisma } from '../db/client';
import { PlanType, BillingCycle, SubscriptionStatus, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { getOrCreateCurrentPeriodUsage } from './usageService';
import { logInfo, logWarn } from '../utils/logger';

export interface CreateTenantOptions {
  orgName: string;
  practiceName?: string; // Optional, defaults to orgName
  adminEmail: string;
  adminName?: string; // Optional, defaults to "Admin User"
  planType?: PlanType; // Default: STARTER
  billingCycle?: BillingCycle; // Default: MONTHLY
  status?: SubscriptionStatus; // Default: ACTIVE
  specialty?: string; // Optional practice specialty
  timeZone?: string; // Default: "America/Chicago"
}

export interface CreateTenantResult {
  org: {
    id: string;
    name: string;
  };
  practice: {
    id: string;
    name: string;
  };
  subscription: {
    id: string;
    planType: PlanType;
    billingCycle: BillingCycle;
    status: SubscriptionStatus;
  };
  adminUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  practiceUser: {
    id: string;
    role: UserRole;
    status: UserStatus;
  };
  usage: {
    id: string;
    periodStart: Date;
    periodEnd: Date;
  };
}

/**
 * Create a new tenant (Organization + Practice + Subscription + Admin User)
 * 
 * This function is idempotent - it will reuse existing entities if they exist,
 * making it safe to call multiple times.
 * 
 * @param options Tenant creation options
 * @returns Created tenant entities
 */
export async function createTenant(options: CreateTenantOptions): Promise<CreateTenantResult> {
  const {
    orgName,
    practiceName = orgName,
    adminEmail,
    adminName = 'Admin User',
    planType = PlanType.starter,
    billingCycle = BillingCycle.monthly,
    status = SubscriptionStatus.active,
    specialty,
    timeZone = 'America/Chicago',
  } = options;

  // Get default admin password from env or use default
  const defaultPassword = process.env.DEFAULT_TENANT_ADMIN_PASSWORD || 'changeme123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. Create or get Organization
  let org = await prisma.organization.findFirst({
    where: { name: orgName },
  });

  if (org) {
    logWarn('Organization already exists, reusing', { orgId: org.id, orgName });
  } else {
    org = await prisma.organization.create({
      data: {
        name: orgName,
      },
    });
    logInfo('Created organization', { orgId: org.id, orgName });
  }

  // 2. Create or get Practice
  let practice = await prisma.practice.findFirst({
    where: {
      name: practiceName,
      orgId: org.id,
    },
  });

  if (practice) {
    logWarn('Practice already exists, reusing', { practiceId: practice.id, practiceName });
  } else {
    practice = await prisma.practice.create({
      data: {
        name: practiceName,
        orgId: org.id,
        specialty: specialty || null,
        timeZone,
      },
    });
    logInfo('Created practice', { practiceId: practice.id, practiceName, orgId: org.id });
  }

  // 3. Create or get Subscription
  let subscription = await prisma.subscription.findFirst({
    where: { orgId: org.id },
  });

  if (subscription) {
    logWarn('Subscription already exists for organization, reusing', {
      subscriptionId: subscription.id,
      orgId: org.id,
    });
  } else {
    const now = new Date();
    const renewalDate = new Date(now);
    
    // Calculate renewal date based on billing cycle
    if (billingCycle === BillingCycle.monthly) {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    } else {
      // Annual
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    }

    // Set plan limits based on plan type
    const includedLimits: Record<string, number> = {
      maxEncountersPerMonth: planType === PlanType.starter ? 200 : planType === PlanType.growth ? 1000 : 10000,
      maxProviders: planType === PlanType.starter ? 3 : planType === PlanType.growth ? 10 : 100,
      maxBillers: planType === PlanType.starter ? 2 : planType === PlanType.growth ? 5 : 50,
    };

    subscription = await prisma.subscription.create({
      data: {
        orgId: org.id,
        planType,
        billingCycle,
        status,
        startDate: now,
        renewalDate,
        includedLimits,
      },
    });
    logInfo('Created subscription', {
      subscriptionId: subscription.id,
      orgId: org.id,
      planType,
      billingCycle,
    });
  }

  // 4. Create or get Admin User
  let adminUser = await prisma.user.findFirst({
    where: { email: adminEmail },
  });

  if (adminUser) {
    logWarn('User already exists, reusing', { userId: adminUser.id, email: adminEmail });
    
    // Update user to link to this practice if not already linked
    if (adminUser.practiceId !== practice.id) {
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: { practiceId: practice.id },
      });
      logInfo('Updated user practice link', { userId: adminUser.id, practiceId: practice.id });
    }
  } else {
    // Parse admin name (first name, last name)
    const nameParts = adminName.split(' ');
    const firstName = nameParts[0] || 'Admin';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    adminUser = await prisma.user.create({
      data: {
        practiceId: practice.id,
        email: adminEmail,
        passwordHash,
        role: UserRole.practice_admin,
        firstName,
        lastName,
      },
    });
    logInfo('Created admin user', { userId: adminUser.id, email: adminEmail });
  }

  // 5. Create or get PracticeUser membership
  let practiceUser = await prisma.practiceUser.findUnique({
    where: {
      practiceId_userId: {
        practiceId: practice.id,
        userId: adminUser.id,
      },
    },
  });

  if (practiceUser) {
    logWarn('PracticeUser membership already exists, reusing', {
      practiceUserId: practiceUser.id,
      practiceId: practice.id,
      userId: adminUser.id,
    });
  } else {
    practiceUser = await prisma.practiceUser.create({
      data: {
        practiceId: practice.id,
        userId: adminUser.id,
        role: UserRole.practice_admin,
        status: UserStatus.ACTIVE,
      },
    });
    logInfo('Created PracticeUser membership', {
      practiceUserId: practiceUser.id,
      practiceId: practice.id,
      userId: adminUser.id,
    });
  }

  // 6. Initialize Usage for current billing period
  const usage = await getOrCreateCurrentPeriodUsage(practice.id);
  logInfo('Initialized usage period', {
    usageId: usage.id,
    practiceId: practice.id,
    periodStart: usage.periodStart.toISOString(),
  });

  return {
    org: {
      id: org.id,
      name: org.name,
    },
    practice: {
      id: practice.id,
      name: practice.name,
    },
    subscription: {
      id: subscription.id,
      planType: subscription.planType,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
    },
    adminUser: {
      id: adminUser.id,
      email: adminUser.email,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      role: adminUser.role,
    },
    practiceUser: {
      id: practiceUser.id,
      role: practiceUser.role,
      status: practiceUser.status,
    },
    usage: {
      id: usage.id,
      periodStart: usage.periodStart,
      periodEnd: usage.periodEnd,
    },
  };
}

