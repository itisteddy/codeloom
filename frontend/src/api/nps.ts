import { apiFetch } from './client';

export interface NpsResponse {
  id: string;
  userId: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface NpsAggregate {
  responseCount: number;
  avgScore: number | null;
  latestComments: Array<{
    score: number;
    comment: string | null;
    createdAt: string;
  }>;
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

export async function submitNps(token: string, score: number, comment?: string): Promise<NpsResponse> {
  return apiCall<NpsResponse>('/practice/nps', token, {
    method: 'POST',
    body: JSON.stringify({ score, comment }),
  });
}

export async function getNpsAggregate(
  token: string,
  fromDate?: string,
  toDate?: string
): Promise<NpsAggregate> {
  const params = new URLSearchParams();
  if (fromDate) params.append('fromDate', fromDate);
  if (toDate) params.append('toDate', toDate);

  const url = `/admin/practice/nps${params.toString() ? `?${params.toString()}` : ''}`;
  return apiCall<NpsAggregate>(url, token);
}

