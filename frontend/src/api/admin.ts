import { apiFetch } from './client';

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

// Billing types
export type PlanType = 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';
export type SubscriptionStatus = 'active' | 'trialing' | 'canceled' | 'past_due';

export interface IncludedLimits {
  maxEncountersPerMonth?: number;
  maxProviders?: number;
  maxBillers?: number;
}

export interface CurrentUsage {
  periodStart: string;
  periodEnd: string;
  encountersCreated: number;
  encountersWithAiSuggestions: number;
  encountersFinalized: number;
  aiSuggestCalls: number;
  trainingAttempts: number;
}

export interface BillingFeatures {
  trainingEnabled: boolean;
  analyticsEnabled: boolean;
  exportsEnabled: boolean;
}

export interface BillingInfo {
  // Subscription info
  planType: PlanType;
  billingCycle: BillingCycle;
  subscriptionStatus: SubscriptionStatus;
  renewalDate: string | null;
  
  // Legacy plan info
  planKey: string;
  planName: string;
  planSince: string;
  
  // Limits and usage
  includedLimits: IncludedLimits;
  currentUsage: CurrentUsage;
  features: BillingFeatures;
  
  // Legacy fields for backwards compatibility
  monthlyEncounterLimit?: number;
  encountersThisMonth?: number;
  aiSuggestCallsThisMonth?: number;
  maxProviders?: number;
  trainingEnabled?: boolean;
  analyticsEnabled?: boolean;
  exportsEnabled?: boolean;
}

// Team types
export type UserRole = 'provider' | 'biller' | 'practice_admin' | 'platform_admin';

export interface TeamMember {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  expiresAt: string;
}

export interface TeamResponse {
  users: TeamMember[];
  pendingInvites: PendingInvite[];
}

export interface InviteResponse {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  inviteLink: string;
}

// Billing API
export async function getBilling(token: string): Promise<BillingInfo> {
  return apiCall<BillingInfo>('/admin/billing', token);
}

// Team API
export async function getTeam(token: string): Promise<TeamResponse> {
  return apiCall<TeamResponse>('/admin/team', token);
}

export async function inviteUser(
  token: string,
  email: string,
  role: UserRole
): Promise<InviteResponse> {
  return apiCall<InviteResponse>('/admin/team/invite', token, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function changeUserRole(
  token: string,
  userId: string,
  role: UserRole
): Promise<{ ok: boolean }> {
  return apiCall<{ ok: boolean }>(`/admin/team/${userId}/role`, token, {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
}

export async function deactivateUser(
  token: string,
  userId: string
): Promise<{ ok: boolean }> {
  return apiCall<{ ok: boolean }>(`/admin/team/${userId}/deactivate`, token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function activateUser(
  token: string,
  userId: string
): Promise<{ ok: boolean }> {
  return apiCall<{ ok: boolean }>(`/admin/team/${userId}/activate`, token, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function cancelInvite(
  token: string,
  inviteId: string
): Promise<{ ok: boolean }> {
  return apiCall<{ ok: boolean }>(`/admin/team/invite/${inviteId}`, token, {
    method: 'DELETE',
  });
}

// Security types
export interface SecuritySettings {
  phiRetentionDays: number | null;
  storePhiAtRest: boolean;
}

// Security API
export async function getSecuritySettings(token: string): Promise<SecuritySettings> {
  return apiCall<SecuritySettings>('/admin/security', token);
}

export async function updateSecuritySettings(
  token: string,
  settings: SecuritySettings
): Promise<SecuritySettings> {
  return apiCall<SecuritySettings>('/admin/security', token, {
    method: 'POST',
    body: JSON.stringify(settings),
  });
}

// Dev-only: Apply PHI retention
export async function applyPhiRetention(
  token: string,
  practiceId?: string
): Promise<{ ok: boolean; message: string }> {
  return apiCall<{ ok: boolean; message: string }>('/dev/phi-retention/apply', token, {
    method: 'POST',
    body: JSON.stringify({ practiceId }),
  });
}

