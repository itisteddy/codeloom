/**
 * PHI Retention Service
 * 
 * Enforces practice-level PHI retention policies by redacting PHI-heavy fields
 * from encounters while preserving non-PHI metadata (codes, timestamps, audit info).
 * 
 * In production, this should be scheduled to run daily via a cron job or cloud scheduler.
 */

import { prisma } from '../db/client';
import { logInfo, logWarn } from '../utils/logger';

/**
 * Apply PHI retention policies for a practice
 * 
 * Behavior:
 * - If storePhiAtRest is false: redact note text and PHI fields from all encounters
 * - If phiRetentionDays is set: redact PHI from encounters older than the retention period
 * 
 * Does NOT delete encounters; only redacts PHI to preserve analytics and usage metrics.
 */
export async function applyPhiRetentionForPractice(practiceId: string): Promise<void> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: {
      id: true,
      name: true,
      phiRetentionDays: true,
      storePhiAtRest: true,
    },
  });

  if (!practice) {
    throw new Error(`Practice not found: ${practiceId}`);
  }

  logInfo('Applying PHI retention for practice', {
    practiceId: practice.id,
    practiceName: practice.name,
    phiRetentionDays: practice.phiRetentionDays,
    storePhiAtRest: practice.storePhiAtRest,
  });

  let whereClause: any = { practiceId };

  // If retention days is set, only process encounters older than cutoff
  if (practice.phiRetentionDays !== null && practice.phiRetentionDays !== undefined) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - practice.phiRetentionDays);
    whereClause.encounterDate = { lt: cutoffDate };
  }

  // If storePhiAtRest is false, redact all encounters (regardless of age)
  // Otherwise, only redact if retention days applies
  if (!practice.storePhiAtRest) {
    // Redact all encounters for this practice
    whereClause = { practiceId };
  }

  // Find encounters to redact
  const encountersToRedact = await prisma.encounter.findMany({
    where: whereClause,
    select: {
      id: true,
      encounterDate: true,
      status: true,
    },
  });

  if (encountersToRedact.length === 0) {
    logInfo('No encounters found requiring PHI redaction', { practiceId });
    return;
  }

  logInfo(`Redacting PHI from ${encountersToRedact.length} encounters`, {
    practiceId,
    encounterCount: encountersToRedact.length,
  });

  // Redact PHI-heavy fields while preserving metadata
  // We set noteText to empty string and clear patient identifiers
  const updateResult = await prisma.encounter.updateMany({
    where: whereClause,
    data: {
      noteText: '', // Redact note text
      patientPseudoId: 'REDACTED', // Replace patient ID with placeholder
      // Keep all other fields: codes, timestamps, status, etc.
    },
  });

  logInfo('PHI redaction completed', {
    practiceId,
    encountersRedacted: updateResult.count,
  });

  if (updateResult.count !== encountersToRedact.length) {
    logWarn('Mismatch between found and updated encounters', {
      practiceId,
      found: encountersToRedact.length,
      updated: updateResult.count,
    });
  }
}

/**
 * Apply PHI retention for all practices
 * Useful for scheduled jobs
 */
export async function applyPhiRetentionForAllPractices(): Promise<void> {
  const practices = await prisma.practice.findMany({
    select: {
      id: true,
      name: true,
      phiRetentionDays: true,
      storePhiAtRest: true,
    },
  });

  logInfo(`Applying PHI retention for ${practices.length} practices`);

  for (const practice of practices) {
    try {
      await applyPhiRetentionForPractice(practice.id);
    } catch (err: any) {
      logWarn('Failed to apply PHI retention for practice', {
        practiceId: practice.id,
        error: err.message,
      });
    }
  }
}

