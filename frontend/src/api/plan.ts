export interface PlanInfo {
  planKey: string;
  planName: string;
  maxProviders: number;
  maxEncountersPerMonth: number;
  trainingEnabled: boolean;
  analyticsEnabled: boolean;
  exportsEnabled: boolean;
  currentUsage: {
    periodStart: string;
    periodEnd: string;
    encountersCreated: number;
    aiSuggestCalls: number;
    trainingAttempts: number;
  };
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

export async function getPlanInfo(token: string): Promise<PlanInfo> {
  return apiCall<PlanInfo>('/practice/plan', token);
}

