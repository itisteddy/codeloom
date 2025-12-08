export type TrainingDifficulty = 'easy' | 'medium' | 'hard';

export interface TrainingCaseSummary {
  id: string;
  title: string;
  specialty: string;
  difficulty: TrainingDifficulty;
  createdAt: string;
}

export interface TrainingCaseDetail extends TrainingCaseSummary {
  noteText: string;
}

export interface TrainingAttemptResult {
  attemptId: string;
  caseId: string;
  userEmCode: string;
  userDiagnosisCodes: string[];
  userProcedureCodes: string[];
  correctEmCode: string;
  correctDiagnosisCodes: string[];
  correctProcedureCodes: string[];
  aiEmCode?: string | null;
  aiDiagnosisCodes?: string[] | null;
  aiProcedureCodes?: string[] | null;
  scorePercent: number;
  matchSummary: {
    em: {
      isExact: boolean;
      isNear: boolean;
    };
    diagnoses: {
      correctCount: number;
      totalCorrect: number;
      extraCount: number;
      missingCodes: string[];
      extraCodes: string[];
    };
    procedures: {
      correctCount: number;
      totalCorrect: number;
      extraCount: number;
      missingCodes: string[];
      extraCodes: string[];
    };
  };
  createdAt: string;
}

import { apiFetch } from './client';

async function apiCall<T>(endpoint: string, token: string, options?: RequestInit): Promise<T> {
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

export async function listTrainingCases(
  token: string,
  filters?: { specialty?: string; difficulty?: TrainingDifficulty }
): Promise<TrainingCaseSummary[]> {
  const params = new URLSearchParams();
  if (filters?.specialty) params.append('specialty', filters.specialty);
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);

  const url = `/training/cases${params.toString() ? `?${params.toString()}` : ''}`;
  return apiCall<TrainingCaseSummary[]>(url, token);
}

export async function getTrainingCase(token: string, id: string): Promise<TrainingCaseDetail> {
  return apiCall<TrainingCaseDetail>(`/training/cases/${id}`, token);
}

export async function submitTrainingAttempt(
  token: string,
  id: string,
  body: {
    userEmCode: string;
    userDiagnosisCodes: string[];
    userProcedureCodes: string[];
  }
): Promise<TrainingAttemptResult> {
  return apiCall<TrainingAttemptResult>(`/training/cases/${id}/attempt`, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

