import { PrismaClient, UserRole, UserStatus, TrainingDifficulty, AuditAction, PlanType, BillingCycle } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { createTenant } from '../src/services/tenancy';

const prisma = new PrismaClient();

/**
 * Creates a sample tenant with Organization, Practice, Subscription, and Admin User
 * Uses the reusable createTenant helper to ensure consistency with CLI tooling
 */
async function createSampleTenant() {
  // Use the reusable createTenant helper
  const tenant = await createTenant({
    orgName: 'Sample Family Practice',
    practiceName: 'Sample Family Practice',
    adminEmail: 'admin@example.com',
    adminName: 'Admin User',
    planType: PlanType.starter,
    billingCycle: BillingCycle.monthly,
    specialty: 'primary_care',
    timeZone: 'America/Chicago',
  });

  // Now create Provider and Biller users for this practice
  const passwordHash = await bcrypt.hash('changeme123', 10);

  const additionalUsers = [
    {
      email: 'provider@example.com',
      firstName: 'Test',
      lastName: 'Provider',
      role: UserRole.provider,
    },
    {
      email: 'biller@example.com',
      firstName: 'Test',
      lastName: 'Biller',
      role: UserRole.biller,
    },
  ];

  const createdUsers = [tenant.adminUser];

  for (const userData of additionalUsers) {
    // Check if user exists by email
    let user = await prisma.user.findFirst({
      where: { email: userData.email },
    });

    if (!user) {
      // Create user with practiceId for backward compatibility
      user = await prisma.user.create({
        data: {
          practiceId: tenant.practice.id,
          email: userData.email,
          passwordHash,
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      });
    } else {
      // Update existing user to link to the practice
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          practiceId: tenant.practice.id,
          role: userData.role,
        },
      });
    }

    // Create PracticeUser join record
    const practiceUser = await prisma.practiceUser.upsert({
      where: {
        practiceId_userId: {
          practiceId: tenant.practice.id,
          userId: user.id,
        },
      },
      create: {
        practiceId: tenant.practice.id,
        userId: user.id,
        role: userData.role,
        status: UserStatus.ACTIVE,
      },
      update: {
        role: userData.role,
        status: UserStatus.ACTIVE,
      },
    });

    createdUsers.push({ user, practiceUser });
  }

  return {
    organization: tenant.org,
    practice: tenant.practice,
    subscription: tenant.subscription,
    users: createdUsers,
  };
}

/**
 * Creates a Platform Admin user (not tied to any practice)
 */
async function createPlatformAdmin() {
  const passwordHash = await bcrypt.hash('changeme123', 10);

  // Check if platform admin exists
  let platformAdmin = await prisma.user.findFirst({
    where: { email: 'platform-admin@codeloom.app' },
  });

  if (!platformAdmin) {
    // Create a dummy practice for backward compatibility (platform admin doesn't need it)
    // We'll use the sample practice as a placeholder
    const samplePractice = await prisma.practice.findFirst({
      where: { name: 'Sample Family Practice' },
    });

    if (!samplePractice) {
      throw new Error('Sample practice must exist before creating platform admin');
    }

    platformAdmin = await prisma.user.create({
      data: {
        practiceId: samplePractice.id, // Placeholder for backward compatibility
        email: 'platform-admin@codeloom.app',
        passwordHash,
        role: UserRole.platform_admin,
        firstName: 'Platform',
        lastName: 'Admin',
      },
    });
  }

  return platformAdmin;
}

async function main() {
  // Create sample tenant
  const sampleTenant = await createSampleTenant();
  console.log('Created sample tenant:', {
    organization: { id: sampleTenant.organization.id, name: sampleTenant.organization.name },
    practice: { id: sampleTenant.practice.id, name: sampleTenant.practice.name },
    subscription: { id: sampleTenant.subscription.id, planType: sampleTenant.subscription.planType },
    users: sampleTenant.users.map(({ user }) => ({
      email: user.email,
      role: user.role,
    })),
  });

  // Create platform admin
  const platformAdmin = await createPlatformAdmin();
  console.log('Created platform admin:', {
    email: platformAdmin.email,
    role: platformAdmin.role,
  });

  // Create pilot practice (for backward compatibility with existing seed data)
  let pilotPractice = await prisma.practice.findFirst({
    where: { name: 'Pilot Practice Alpha' },
  });

  if (!pilotPractice) {
    // Create org for pilot practice
    const pilotOrg = await prisma.organization.create({
      data: {
        name: 'Pilot Practice Alpha Organization',
        billingContactName: 'Pilot Owner',
        billingContactEmail: 'pilot@example.com',
      },
    });

    pilotPractice = await prisma.practice.create({
      data: {
        name: 'Pilot Practice Alpha',
        orgId: pilotOrg.id,
        specialty: 'primary_care',
        timeZone: 'America/Chicago',
      },
    });

    // Create subscription for pilot
    const now = new Date();
    const renewalDate = new Date(now);
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    await prisma.subscription.create({
      data: {
        orgId: pilotOrg.id,
        planType: PlanType.growth,
        billingCycle: BillingCycle.monthly,
        status: SubscriptionStatus.active,
        startDate: now,
        renewalDate: renewalDate,
      },
    });
  }

  // Create pilot users
  const passwordHash = await bcrypt.hash('changeme123', 10);

  const pilotUsers = [
    {
      email: 'alpha.provider@demo.com',
      firstName: 'Alpha',
      lastName: 'Provider',
      role: UserRole.provider,
    },
    {
      email: 'alpha.biller@demo.com',
      firstName: 'Alpha',
      lastName: 'Biller',
      role: UserRole.biller,
    },
  ];

  for (const userData of pilotUsers) {
    let user = await prisma.user.findFirst({
      where: { email: userData.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          practiceId: pilotPractice.id,
          email: userData.email,
          passwordHash,
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
        },
      });
    }

    // Create PracticeUser join
    await prisma.practiceUser.upsert({
      where: {
        practiceId_userId: {
          practiceId: pilotPractice.id,
          userId: user.id,
        },
      },
      create: {
        practiceId: pilotPractice.id,
        userId: user.id,
        role: userData.role,
        status: UserStatus.ACTIVE,
      },
      update: {
        role: userData.role,
        status: UserStatus.ACTIVE,
      },
    });
  }

  // Create pilot encounters (idempotent)
  const existingEncounters = await prisma.encounter.findMany({
    where: { practiceId: pilotPractice.id },
    take: 1,
  });

  if (existingEncounters.length === 0) {
    const pilotProvider = await prisma.user.findFirst({
      where: { email: 'alpha.provider@demo.com' },
    });

    const pilotBiller = await prisma.user.findFirst({
      where: { email: 'alpha.biller@demo.com' },
    });

    if (pilotProvider && pilotBiller) {
      // Draft encounter
      await prisma.encounter.create({
        data: {
          practiceId: pilotPractice.id,
          providerId: pilotProvider.id,
          patientPseudoId: 'pilot_001',
          encounterDate: new Date('2025-12-01'),
          visitType: 'office_established',
          specialty: 'primary_care',
          noteText: 'Patient presents for routine follow-up. Blood pressure well controlled. Continue current medications.',
          status: 'draft',
        },
      });

      // AI suggested encounter
      await prisma.encounter.create({
        data: {
          practiceId: pilotPractice.id,
          providerId: pilotProvider.id,
          patientPseudoId: 'pilot_002',
          encounterDate: new Date('2025-12-02'),
          visitType: 'office_established',
          specialty: 'primary_care',
          noteText: '55-year-old male with type 2 diabetes and hypertension. Review of systems negative. Physical exam unremarkable. Plan: Continue metformin and lisinopril. Check A1C in 3 months.',
          status: 'ai_suggested',
          aiEmSuggested: '99214',
          aiEmConfidence: 0.85,
          aiDiagnosisSuggestionsJson: [
            { code: 'E11.9', description: 'Type 2 diabetes', confidence: 0.9 },
            { code: 'I10', description: 'Hypertension', confidence: 0.88 },
          ],
        },
      });

      // Finalized encounter
      const finalizedEncounter = await prisma.encounter.create({
        data: {
          practiceId: pilotPractice.id,
          providerId: pilotProvider.id,
          patientPseudoId: 'pilot_003',
          encounterDate: new Date('2025-12-03'),
          visitType: 'office_established',
          specialty: 'primary_care',
          noteText: 'Annual wellness visit. Patient doing well. All screenings up to date.',
          status: 'finalized',
          finalEmCode: '99213',
          finalEmCodeSource: 'biller',
          finalDiagnosisJson: [{ code: 'Z00.00', description: 'Encounter for general adult medical examination', source: 'user' }],
          finalizedByUserId: pilotBiller.id,
          finalizedAt: new Date('2025-12-03'),
        },
      });

      // Create audit event for finalized encounter
      await prisma.auditEvent.create({
        data: {
          practiceId: pilotPractice.id,
          encounterId: finalizedEncounter.id,
          userId: pilotBiller.id,
          userRole: UserRole.biller,
          action: AuditAction.USER_FINALIZED_CODES,
          payload: { field: 'status', from: 'ai_suggested', to: 'finalized' },
        },
      });
    }
  }

  // Create training cases (idempotent)
  const existingTrainingCases = await prisma.trainingCase.count();
  if (existingTrainingCases === 0) {
    await prisma.trainingCase.createMany({
      data: [
        {
          id: randomUUID(),
          title: 'Diabetes follow-up',
          specialty: 'primary_care',
          difficulty: TrainingDifficulty.medium,
          noteText:
            '55-year-old male with type 2 diabetes and hypertension presents for routine follow-up. Patient reports good glucose control with current medication. Blood pressure well-controlled. Physical exam unremarkable. Plan: Continue current medications, recheck labs in 3 months.',
          correctEmCode: '99214',
          correctDiagnosisCodes: JSON.stringify(['E11.9', 'I10']),
          correctProcedureCodes: JSON.stringify([]),
        },
        {
          id: randomUUID(),
          title: 'Acute URI',
          specialty: 'primary_care',
          difficulty: TrainingDifficulty.easy,
          noteText:
            '24-year-old female with sore throat and cough x3 days, no significant PMH. Exam reveals mild pharyngeal erythema, no exudate. Rapid strep negative. Plan: Supportive care, return if symptoms worsen.',
          correctEmCode: '99213',
          correctDiagnosisCodes: JSON.stringify(['J06.9']),
          correctProcedureCodes: JSON.stringify([]),
        },
        {
          id: randomUUID(),
          title: 'Hypertension management',
          specialty: 'primary_care',
          difficulty: TrainingDifficulty.medium,
          noteText:
            '62-year-old male with hypertension returns for medication adjustment. BP today 145/92. Reviewing medication compliance and lifestyle modifications. Adjusting ACE inhibitor dosage. Follow-up in 4 weeks.',
          correctEmCode: '99214',
          correctDiagnosisCodes: JSON.stringify(['I10']),
          correctProcedureCodes: JSON.stringify([]),
        },
      ],
    });
  }

  // Create training attempts for pilot practice users
  const trainingCases = await prisma.trainingCase.findMany({ take: 2 });
  if (trainingCases.length > 0) {
    const pilotProvider = await prisma.user.findFirst({
      where: { email: 'alpha.provider@demo.com' },
    });

    if (pilotProvider) {
      const existingAttempts = await prisma.trainingAttempt.findMany({
        where: { userId: pilotProvider.id },
        take: 1,
      });

      if (existingAttempts.length === 0 && trainingCases[0]) {
        await prisma.trainingAttempt.create({
          data: {
            userId: pilotProvider.id,
            trainingCaseId: trainingCases[0].id,
            userEmCode: '99213',
            userDiagnosisCodes: JSON.stringify(['E11.9']),
            userProcedureCodes: JSON.stringify([]),
            aiEmCode: '99214',
            aiDiagnosisCodes: JSON.stringify(['E11.9', 'I10']),
            aiProcedureCodes: JSON.stringify([]),
            scorePercent: 75,
            matchSummary: {
              em: { isExact: false, isNear: true },
              diagnoses: { correctCount: 1, totalCorrect: 2, extraCount: 0, missingCodes: ['I10'], extraCodes: [] },
              procedures: { correctCount: 0, totalCorrect: 0, extraCount: 0, missingCodes: [], extraCodes: [] },
            },
          },
        });
      }
    }
  }

  console.log('✅ Seed completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
