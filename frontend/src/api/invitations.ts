import { apiFetch } from './client';

export interface UserInvite {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  inviteUrl: string;
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

export async function createInvite(
  token: string,
  practiceId: string,
  email: string,
  role: string
): Promise<UserInvite> {
  return apiCall<UserInvite>(`/admin/practices/${practiceId}/invites`, token, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function listInvites(token: string, practiceId: string): Promise<UserInvite[]> {
  return apiCall<UserInvite[]>(`/admin/practices/${practiceId}/invites`, token);
}

