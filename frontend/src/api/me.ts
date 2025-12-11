/**
 * API client for /api/me endpoints
 */

import { apiFetch } from './client';

// Types
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  practiceId: string;
  practiceName: string;
  orgId: string | null;
  orgName: string | null;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  timeZone: string | null;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY';
  notificationPrefs: {
    emailAssignments?: boolean;
    emailWeeklySummary?: boolean;
  };
  rolePrefs: Record<string, unknown>;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
}

export interface UpdateSettingsRequest {
  theme?: 'light' | 'dark' | 'system';
  timeZone?: string | null;
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY';
  notificationPrefs?: {
    emailAssignments?: boolean;
    emailWeeklySummary?: boolean;
  };
  rolePrefs?: Record<string, unknown>;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Helper function
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

// API functions
export async function getCurrentUser(token: string): Promise<CurrentUser> {
  return apiCall<CurrentUser>('/me', token);
}

export async function getSettings(token: string): Promise<UserSettings> {
  return apiCall<UserSettings>('/me/settings', token);
}

export async function updateSettings(
  token: string,
  settings: UpdateSettingsRequest
): Promise<UserSettings> {
  return apiCall<UserSettings>('/me/settings', token, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function updateProfile(
  token: string,
  profile: UpdateProfileRequest
): Promise<CurrentUser> {
  return apiCall<CurrentUser>('/me/profile', token, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
}

export async function changePassword(
  token: string,
  request: ChangePasswordRequest
): Promise<{ success: boolean; message: string }> {
  return apiCall('/me/change-password', token, {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

