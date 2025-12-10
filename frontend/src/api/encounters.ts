export type EncounterStatus = 'draft' | 'ai_suggested' | 'finalized' | 'exported';
export type UserRole = 'provider' | 'biller' | 'admin';

export interface EmAlternative {
  code: string;
  label: string;
  recommended: boolean;
  confidence?: number | null;
  level?: number | null;
}

export interface AiDiagnosisSuggestion {
  code: string;
  description: string;
  confidence: number;
  noteSnippets: string[];
}

export interface AiProcedureSuggestion {
  code: string;
  description: string;
  confidence: number;
  noteSnippets: string[];
  withinCuratedSet: boolean;
}

export interface AiSafetySummary {
  hadInvalidCodes: boolean;
  filteredCodesCount: number;
  hadFormatIssues: boolean;
}

// Structured AI summary types
export interface EmDisplay {
  code: string;
  confidence: number;
  level?: number | null;
}

export interface CodeSuggestion {
  code: string;
  description?: string;
  confidence?: number;
}

export interface FinalCode {
  code: string;
  description?: string;
  modifiers?: string[];
}

export interface EncounterAiSummary {
  emRecommended: EmDisplay | null;
  emHighestSupported: EmDisplay | null;
  diagnosisSuggestions: CodeSuggestion[];
  procedureSuggestions: CodeSuggestion[];
  finalDiagnoses: FinalCode[];
  finalProcedures: FinalCode[];
}

export interface EncounterDto {
  id: string;
  practiceId: string;
  providerId: string;
  patientPseudoId: string;
  encounterDate: string;
  visitType: string;
  specialty: string;
  noteText: string;
  status: EncounterStatus;
  aiEmSuggested?: string | null;
  aiEmConfidence?: number | null;
  aiEmHighestSupportedCode?: string | null;
  aiEmHighestSupportedConfidence?: number | null;
  aiEmAlternatives?: EmAlternative[] | null;
  aiDiagnosisSuggestions?: AiDiagnosisSuggestion[] | null;
  aiProcedureSuggestions?: AiProcedureSuggestion[] | null;
  aiConfidenceBucket?: 'low' | 'medium' | 'high' | null;
  aiModelId?: string | null;
  aiSafetySummary?: AiSafetySummary | null;
  denialRiskLevel?: 'low' | 'medium' | 'high' | null;
  denialRiskReasons?: string[] | null;
  hadUndercodeHint?: boolean;
  hadMissedServiceHint?: boolean;
  finalEmCode?: string | null;
  finalDiagnosisCodes?: FinalDiagnosisCode[];
  finalProcedureCodes?: FinalProcedureCode[];
  aiSummary?: EncounterAiSummary;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
}

export interface FinalDiagnosisCode {
  code: string;
  description: string;
  source: 'ai' | 'user';
}

export interface FinalProcedureCode {
  code: string;
  description: string;
  modifiers: string[];
  source: 'ai' | 'user';
}

export interface AuditEventDto {
  id: string;
  action: string;
  userId: string;
  userRole: UserRole;
  userName?: string;
  createdAt: string;
  payload: any;
}

export interface EncounterSummaryDto {
  id: string;
  patientPseudoId: string;
  encounterDate: string;
  visitType: string;
  specialty: string;
  status: EncounterStatus;
  aiEmSuggested?: string | null;
  finalEmCode?: string | null;
}

import { apiFetch } from './client';

async function apiCall<T>(
  endpoint: string,
  token: string,
  options?: RequestInit
): Promise<T> {
  const response = await apiFetch(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function listEncounters(token: string): Promise<EncounterSummaryDto[]> {
  return apiCall<EncounterSummaryDto[]>('/encounters', token);
}

export async function createEncounter(
  token: string,
  body: {
    patientPseudoId: string;
    encounterDate: string;
    visitType: string;
    specialty: string;
    noteText: string;
    providerId?: string;
  }
): Promise<EncounterDto> {
  return apiCall<EncounterDto>('/encounters', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getEncounter(token: string, id: string): Promise<EncounterDto> {
  return apiCall<EncounterDto>(`/encounters/${id}`, token);
}

export async function updateEncounterMetadata(
  token: string,
  id: string,
  patch: {
    patientPseudoId?: string;
    encounterDate?: string;
    visitType?: string;
    specialty?: string;
    noteText?: string;
  }
): Promise<EncounterDto> {
  return apiCall<EncounterDto>(`/encounters/${id}`, token, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function runSuggestions(token: string, id: string): Promise<EncounterDto> {
  return apiCall<EncounterDto>(`/encounters/${id}/suggest`, token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function updateEncounterCodes(
  token: string,
  id: string,
  body: {
    finalEmCode?: string | null;
    finalEmCodeSource?: 'ai' | 'provider' | 'biller' | 'mixed' | null;
    finalDiagnosisCodes?: FinalDiagnosisCode[] | null;
    finalProcedureCodes?: FinalProcedureCode[] | null;
  }
): Promise<EncounterDto> {
  return apiCall<EncounterDto>(`/encounters/${id}/codes`, token, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function finalizeEncounter(token: string, id: string): Promise<EncounterDto> {
  return apiCall<EncounterDto>(`/encounters/${id}/finalize`, token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function getEncounterAudit(token: string, id: string): Promise<AuditEventDto[]> {
  return apiCall<AuditEventDto[]>(`/encounters/${id}/audit`, token);
}

// Update final codes using normalized tables
export async function updateFinalCodes(
  token: string,
  id: string,
  body: {
    diagnoses: { code: string; description?: string }[];
    procedures: { code: string; description?: string; modifiers?: string[] }[];
  }
): Promise<EncounterDto> {
  return apiCall<EncounterDto>(`/encounters/${id}/final-codes`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

