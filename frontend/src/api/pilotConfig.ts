import { apiFetch } from './client';

export interface PilotConfig {
  pilotLabel: string | null;
  pilotStartDate: string | null;
  pilotEndDate: string | null;
  enabledSpecialties: string[] | null;
  llmModeOverride: string | null;
  providerCanFinalize: boolean;
  baseline: any | null;
}

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

export async function getPilotConfig(token: string): Promise<PilotConfig> {
  return apiCall<PilotConfig>('/admin/pilot/config', token);
}

export async function updatePilotConfig(
  token: string,
  updates: Partial<PilotConfig>
): Promise<PilotConfig> {
  return apiCall<PilotConfig>('/admin/pilot/config', token, {
    method: 'POST',
    body: JSON.stringify(updates),
  });
}

export async function setBaseline(token: string, baseline: any): Promise<void> {
  await apiCall('/admin/pilot/baseline', token, {
    method: 'POST',
    body: JSON.stringify(baseline),
  });
}

