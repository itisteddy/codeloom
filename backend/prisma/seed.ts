import { PrismaClient, UserRole, TrainingDifficulty, AuditAction } from '@prisma/client';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create or get test practice
  let practice = await prisma.practice.findFirst({
    where: { name: 'Codeloom Test Practice' },
  });

  if (!practice) {
    practice = await prisma.practice.create({
      data: {
        name: 'Codeloom Test Practice',
      },
    });
  }

  const passwordHash = await bcrypt.hash('changeme123', 10);

  // Create or get provider
  let provider = await prisma.user.findFirst({
    where: { email: 'provider@example.com', practiceId: practice.id },
  });

  if (!provider) {
    provider = await prisma.user.create({
      data: {
        practiceId: practice.id,
        email: 'provider@example.com',
        passwordHash,
        role: UserRole.provider,
        firstName: 'Test',
        lastName: 'Provider',
      },
    });
  }

  // Create or get biller
  let biller = await prisma.user.findFirst({
    where: { email: 'biller@example.com', practiceId: practice.id },
  });

  if (!biller) {
    biller = await prisma.user.create({
      data: {
        practiceId: practice.id,
        email: 'biller@example.com',
        passwordHash,
        role: UserRole.biller,
        firstName: 'Test',
        lastName: 'Biller',
      },
    });
  }

  // Create Pilot Practice Alpha
  let pilotPractice = await prisma.practice.findFirst({
    where: { name: 'Pilot Practice Alpha' },
  });

  if (!pilotPractice) {
    pilotPractice = await prisma.practice.create({
      data: {
        name: 'Pilot Practice Alpha',
      },
    });
  }

  // Create pilot provider
  let pilotProvider = await prisma.user.findFirst({
    where: { email: 'alpha.provider@demo.com', practiceId: pilotPractice.id },
  });

  if (!pilotProvider) {
    pilotProvider = await prisma.user.create({
      data: {
        practiceId: pilotPractice.id,
        email: 'alpha.provider@demo.com',
        passwordHash,
        role: UserRole.provider,
        firstName: 'Alpha',
        lastName: 'Provider',
      },
    });
  }

  // Create pilot biller
  let pilotBiller = await prisma.user.findFirst({
    where: { email: 'alpha.biller@demo.com', practiceId: pilotPractice.id },
  });

  if (!pilotBiller) {
    pilotBiller = await prisma.user.create({
      data: {
        practiceId: pilotPractice.id,
        email: 'alpha.biller@demo.com',
        passwordHash,
        role: UserRole.biller,
        firstName: 'Alpha',
        lastName: 'Biller',
      },
    });
  }

  // Create pilot encounters
  const existingEncounters = await prisma.encounter.findMany({
    where: { practiceId: pilotPractice.id },
    take: 1,
  });

  if (existingEncounters.length === 0) {
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

  // eslint-disable-next-line no-console
  console.log('Seeded practices, users, encounters, and training cases.');
  // eslint-disable-next-line no-console
  console.log({
    testPractice: { id: practice.id, name: practice.name },
    pilotPractice: { id: pilotPractice.id, name: pilotPractice.name },
    users: {
      provider: { email: provider.email, role: provider.role },
      biller: { email: biller.email, role: biller.role },
      pilotProvider: { email: pilotProvider.email, role: pilotProvider.role },
      pilotBiller: { email: pilotBiller.email, role: pilotBiller.role },
    },
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
