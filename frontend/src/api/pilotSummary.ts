export interface PilotSummary {
  practiceName: string;
  pilotLabel?: string | null;
  periodStart: string;
  periodEnd: string;
  planKey: string;
  usage: {
    encountersCreated: number;
    aiSuggestCalls: number;
    trainingAttempts: number;
  };
  analytics: {
    encounterCount: number;
    finalizedCount: number;
    aiUsageRate: number;
    overrideRate: number;
    avgTimeToFinalizeMinutes: number | null;
    avgTrainingScorePercent: number | null;
  };
  feedback: {
    encounterFeedbackCount: number;
    helpfulRate: number | null;
  };
  nps: {
    responseCount: number;
    avgScore: number | null;
  };
  baseline?: {
    avgTimePerClaimMinutes?: number;
    denialRatePercent?: number;
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

export async function getPilotSummary(
  token: string,
  fromDate?: string,
  toDate?: string
): Promise<PilotSummary> {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);

  const url = `/admin/pilot/summary${params.toString() ? `?${params.toString()}` : ''}`;
  return apiCall<PilotSummary>(url, token);
}

export async function exportPilotSummary(
  token: string,
  fromDate?: string,
  toDate?: string
): Promise<void> {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);

  const url = `/admin/pilot/summary/export${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiFetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = `pilot_summary_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

