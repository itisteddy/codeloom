import { EncounterSuggestionsResult, EmAlternative, AiDiagnosisSuggestion, AiProcedureSuggestion } from '../types/aiSuggestions';

export interface SafetySummary {
  hadInvalidCodes: boolean;
  filteredCodesCount: number;
  hadFormatIssues: boolean;
}

export interface ValidationResult {
  cleaned: EncounterSuggestionsResult;
  safetySummary: SafetySummary;
}

// E/M code pattern: 5 digits starting with 99 (e.g., 99213, 99309)
const EM_CODE_PATTERN = /^99\d{3}$/;

// ICD-10-CM pattern: Letter + 2 digits + optional letter + optional decimal + 1-4 alphanumeric
// Examples: E11.9, I10, A00.0, Z00.00
const ICD10_PATTERN = /^[A-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/;

// CPT/HCPCS pattern: 4-5 alphanumeric characters
// Examples: J3420, 99213, G0001
const PROCEDURE_CODE_PATTERN = /^[A-Z0-9]{4,5}$/;

function clampConfidence(value: any): number | null {
  if (value == null) return null;
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return null;
  return Math.max(0, Math.min(1, num));
}

function isValidEmCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') return false;
  return EM_CODE_PATTERN.test(code.trim());
}

function isValidDiagnosisCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') return false;
  return ICD10_PATTERN.test(code.trim().toUpperCase());
}

function isValidProcedureCode(code: string | null | undefined): boolean {
  if (!code || typeof code !== 'string') return false;
  return PROCEDURE_CODE_PATTERN.test(code.trim().toUpperCase());
}

export function validateAndCleanSuggestions(
  result: EncounterSuggestionsResult
): ValidationResult {
  const safetySummary: SafetySummary = {
    hadInvalidCodes: false,
    filteredCodesCount: 0,
    hadFormatIssues: false,
  };

  // Ensure arrays exist
  const cleaned: EncounterSuggestionsResult = {
    emSuggested: result.emSuggested ?? null,
    emAlternatives: Array.isArray(result.emAlternatives) ? result.emAlternatives : [],
    emConfidence: clampConfidence(result.emConfidence),
    diagnoses: Array.isArray(result.diagnoses) ? result.diagnoses : [],
    procedures: Array.isArray(result.procedures) ? result.procedures : [],
    confidenceBucket: result.confidenceBucket ?? null,
    denialRiskLevel: result.denialRiskLevel ?? null,
    denialRiskReasons: Array.isArray(result.denialRiskReasons) ? result.denialRiskReasons : [],
    hadUndercodeHint: Boolean(result.hadUndercodeHint),
    hadMissedServiceHint: Boolean(result.hadMissedServiceHint),
  };

  // Validate E/M suggested code
  if (cleaned.emSuggested && !isValidEmCode(cleaned.emSuggested)) {
    safetySummary.hadInvalidCodes = true;
    safetySummary.filteredCodesCount += 1;
    cleaned.emSuggested = null;
  }

  // Validate E/M alternatives
  const validAlternatives: EmAlternative[] = [];
  for (const alt of cleaned.emAlternatives) {
    if (isValidEmCode(alt.code)) {
      validAlternatives.push(alt);
    } else {
      safetySummary.hadInvalidCodes = true;
      safetySummary.filteredCodesCount += 1;
    }
  }
  cleaned.emAlternatives = validAlternatives;

  // Validate diagnosis codes
  const validDiagnoses: AiDiagnosisSuggestion[] = [];
  for (const dx of cleaned.diagnoses) {
    if (isValidDiagnosisCode(dx.code)) {
      // Also clamp confidence
      validDiagnoses.push({
        ...dx,
        confidence: clampConfidence(dx.confidence) ?? 0,
        noteSnippets: Array.isArray(dx.noteSnippets) ? dx.noteSnippets : [],
      });
    } else {
      safetySummary.hadInvalidCodes = true;
      safetySummary.filteredCodesCount += 1;
    }
  }
  cleaned.diagnoses = validDiagnoses;

  // Validate procedure codes
  const validProcedures: AiProcedureSuggestion[] = [];
  for (const proc of cleaned.procedures) {
    if (isValidProcedureCode(proc.code)) {
      // Also clamp confidence
      validProcedures.push({
        ...proc,
        confidence: clampConfidence(proc.confidence) ?? 0,
        noteSnippets: Array.isArray(proc.noteSnippets) ? proc.noteSnippets : [],
        withinCuratedSet: Boolean(proc.withinCuratedSet),
      });
    } else {
      safetySummary.hadInvalidCodes = true;
      safetySummary.filteredCodesCount += 1;
    }
  }
  cleaned.procedures = validProcedures;

  // Check for format issues (missing required fields, type mismatches)
  if (
    cleaned.emSuggested === null &&
    cleaned.emAlternatives.length === 0 &&
    cleaned.diagnoses.length === 0 &&
    cleaned.procedures.length === 0
  ) {
    // If everything was filtered out, mark as format issue
    if (result.emSuggested || (result.emAlternatives && result.emAlternatives.length > 0) ||
        (result.diagnoses && result.diagnoses.length > 0) ||
        (result.procedures && result.procedures.length > 0)) {
      safetySummary.hadFormatIssues = true;
    }
  }

  return {
    cleaned,
    safetySummary,
  };
}

