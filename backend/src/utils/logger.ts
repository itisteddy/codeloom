/**
 * PHI-safe logging utility
 * 
 * Ensures we never log raw note text, patient identifiers, or other PHI.
 * All metadata is scrubbed before logging.
 */

// Fields that should never appear in logs (PHI-sensitive)
const PHI_FIELDS = new Set([
  'note',
  'noteText',
  'text',
  'body',
  'patientName',
  'patientId',
  'patientPseudoId',
  'dob',
  'dateOfBirth',
  'mrn',
  'medicalRecordNumber',
  'ssn',
  'socialSecurityNumber',
  'email',
  'phone',
  'address',
]);

/**
 * Scrub an object to remove PHI-sensitive fields
 */
export function scrubForLogging(input: unknown): unknown {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(scrubForLogging);
  }

  const obj = input as Record<string, unknown>;
  const scrubbed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Skip PHI-sensitive fields
    if (PHI_FIELDS.has(lowerKey)) {
      continue;
    }

    // For encounter-like objects, keep only safe metadata
    if (lowerKey === 'encounter' && typeof value === 'object' && value !== null) {
      const enc = value as Record<string, unknown>;
      scrubbed[key] = {
        id: enc.id,
        practiceId: enc.practiceId,
        providerId: enc.providerId,
        status: enc.status,
        createdAt: enc.createdAt,
        updatedAt: enc.updatedAt,
        // Explicitly exclude noteText and patient identifiers
      };
      continue;
    }

    // Recursively scrub nested objects
    if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubForLogging(value);
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

/**
 * Log info message with scrubbed metadata
 */
export function logInfo(message: string, meta?: Record<string, unknown>): void {
  const scrubbed = meta ? scrubForLogging(meta) : undefined;
  if (scrubbed) {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, scrubbed);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`);
  }
}

/**
 * Log warning message with scrubbed metadata
 */
export function logWarn(message: string, meta?: Record<string, unknown>): void {
  const scrubbed = meta ? scrubForLogging(meta) : undefined;
  if (scrubbed) {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`, scrubbed);
  } else {
    // eslint-disable-next-line no-console
    console.warn(`[WARN] ${message}`);
  }
}

/**
 * Log error message with scrubbed metadata
 */
export function logError(message: string, meta?: Record<string, unknown>): void {
  const scrubbed = meta ? scrubForLogging(meta) : undefined;
  if (scrubbed) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, scrubbed);
  } else {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`);
  }
}

