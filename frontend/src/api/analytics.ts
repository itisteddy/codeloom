export interface PracticeAnalyticsSummary {
  encounterCount: number;
  finalizedCount: number;
  aiSuggestedCount: number;
  aiUsageRate: number;
  overrideRate: number;
  avgTimeToFinalizeMinutes: number | null;
  trainingAttemptsCount: number;
  avgTrainingScorePercent: number | null;
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

export async function getAnalyticsSummary(
  token: string,
  params: { fromDate: string; toDate: string }
): Promise<PracticeAnalyticsSummary> {
  const qs = new URLSearchParams({
    fromDate: params.fromDate,
    toDate: params.toDate,
  });
  return apiCall<PracticeAnalyticsSummary>(`/analytics/summary?${qs.toString()}`, token);
}

export async function downloadEncountersCsv(
  token: string,
  params: { fromDate: string; toDate: string; status?: string }
): Promise<Blob> {
  const qs = new URLSearchParams({
    fromDate: params.fromDate,
    toDate: params.toDate,
    format: 'csv',
    ...(params.status ? { status: params.status } : {}),
  });

  const res = await apiFetch(`/exports/encounters?${qs.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to download CSV');
  }

  return await res.blob();
}

