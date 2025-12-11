/**
 * Codeloom HQ (Platform Admin Console) API Client
 */

import { apiFetch } from './client';

export interface HqOverviewOrg {
  orgId: string;
  orgName: string;
  status: 'ACTIVE' | 'TRIALING' | 'CANCELED' | 'PAST_DUE';
  planType: string;
  billingCycle: string;
  practicesCount: number;
  totalProviders: number;
  totalBillers: number;
  totalAdmins: number;
  usage: {
    periodStart: string;
    periodEnd: string;
    encountersWithAiSuggestions: number;
    encountersFinalized: number;
    trainingAttempts: number;
    aiCalls: number;
    lastActivityAt: string | null;
  };
  nps: {
    averageScore: number | null;
    responsesCount: number;
  } | null;
}

export interface HqOrgDetail {
  org: {
    id: string;
    name: string;
    status: string;
    planType: string;
    billingCycle: string;
    startDate: string;
    renewalDate: string | null;
  };
  practices: Array<{
    id: string;
    name: string;
    specialty: string | null;
    timeZone: string | null;
    providerCount: number;
    billerCount: number;
    adminCount: number;
    usage: {
      periodStart: string;
      periodEnd: string;
      encountersWithAiSuggestions: number;
      encountersFinalized: number;
      trainingAttempts: number;
      aiCalls: number;
      lastActivityAt: string | null;
    };
  }>;
  nps: {
    averageScore: number | null;
    responsesCount: number;
    latestComments: Array<{
      id: string;
      score: number;
      comment: string | null;
      createdAt: string;
    }>;
  } | null;
}

export async function getHqOverview(
  token: string,
  filters?: { planType?: string; status?: string; search?: string }
): Promise<{ organizations: HqOverviewOrg[] }> {
  const params = new URLSearchParams();
  if (filters?.planType) params.append('planType', filters.planType);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.search) params.append('search', filters.search);

  const url = `/api/hq/overview${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await apiFetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch HQ overview: ${response.statusText}`);
  }
  return (await response.json()) as { organizations: HqOverviewOrg[] };
}

export async function getHqOrgDetail(token: string, orgId: string): Promise<HqOrgDetail> {
  const response = await apiFetch(`/api/hq/orgs/${orgId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch org detail: ${response.statusText}`);
  }
  return (await response.json()) as HqOrgDetail;
}

