export interface EncounterFeedback {
  helpful: boolean;
  comment?: string | null;
  createdAt?: string;
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

export async function submitEncounterFeedback(
  token: string,
  encounterId: string,
  feedback: {
    helpful: boolean;
    comment?: string | null;
  }
): Promise<void> {
  await apiCall(`/encounters/${encounterId}/feedback`, token, {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
}

export async function getEncounterFeedback(
  token: string,
  encounterId: string
): Promise<EncounterFeedback | null> {
  return apiCall<EncounterFeedback | null>(`/encounters/${encounterId}/feedback`, token);
}

