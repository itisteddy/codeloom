export interface PracticeConfig {
  llmMode: string;
  enabledSpecialties: string[];
  providerCanEditCodes: boolean;
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

export async function getPracticeConfig(token: string): Promise<PracticeConfig> {
  return apiCall<PracticeConfig>('/practice/config', token);
}

export async function updatePracticeConfig(
  token: string,
  updates: Partial<PracticeConfig>
): Promise<PracticeConfig> {
  return apiCall<PracticeConfig>('/practice/config', token, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

