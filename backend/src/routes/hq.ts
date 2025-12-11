/**
 * Codeloom HQ (Platform Admin Console) Routes
 * 
 * Internal-only routes for PLATFORM_ADMIN users to view and manage organizations,
 * practices, subscriptions, and usage across the entire platform.
 */

import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { prisma } from '../db/client';
import { UserRole, SubscriptionStatus } from '@prisma/client';
import { logInfo } from '../utils/logger';

export const hqRouter = Router();

// All HQ routes require PLATFORM_ADMIN role
const requirePlatformAdmin = requireRole([UserRole.platform_admin]);

/**
 * GET /api/hq/overview
 * Returns a list of organizations with basic plan + usage summary
 */
hqRouter.get(
  '/overview',
  requireAuth,
  requirePlatformAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { planType, status, search } = req.query;

      // Build where clause for filtering
      const orgWhere: any = {};
      const subscriptionWhere: any = {};

      if (planType && planType !== 'all') {
        subscriptionWhere.planType = planType;
      }

      if (status && status !== 'all') {
        subscriptionWhere.status = (status as string).toUpperCase();
      }

      // Fetch all organizations with their subscriptions and practices
      const organizations = await prisma.organization.findMany({
        where: orgWhere,
        include: {
          subscriptions: {
            where: subscriptionWhere,
            orderBy: { createdAt: 'desc' },
            take: 1, // Get the most recent subscription
          },
          practices: {
            include: {
              practiceUsers: {
                where: {
                  status: 'ACTIVE',
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      // Get current period (monthly)
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Process each organization
      const orgsWithUsage = await Promise.all(
        organizations.map(async (org) => {
          const subscription = org.subscriptions[0] || null;

          // Skip if no subscription matches filters
          if (!subscription) {
            return null;
          }

          // Apply search filter
          if (search) {
            const searchLower = (search as string).toLowerCase();
            const matchesName = org.name.toLowerCase().includes(searchLower);
            const matchesEmail = org.billingContactEmail?.toLowerCase().includes(searchLower) || false;
            if (!matchesName && !matchesEmail) {
              return null;
            }
          }

          // Count users by role across all practices
          let totalProviders = 0;
          let totalBillers = 0;
          let totalAdmins = 0;

          const practiceIds = org.practices.map((p) => p.id);

          // Get usage for all practices in current period
          const usagePeriods = await prisma.usagePeriod.findMany({
            where: {
              practiceId: { in: practiceIds },
              periodStart: { lte: now },
              periodEnd: { gte: now },
            },
          });

          // Aggregate usage across all practices
          let totalEncountersWithAiSuggestions = 0;
          let totalEncountersFinalized = 0;
          let totalTrainingAttempts = 0;
          let totalAiCalls = 0;

          usagePeriods.forEach((period) => {
            totalEncountersWithAiSuggestions += period.encountersWithAiSuggestions;
            totalEncountersFinalized += period.encountersFinalized;
            totalTrainingAttempts += period.trainingAttempts;
            totalAiCalls += period.aiCalls || 0;
          });

          // Count users by role
          org.practices.forEach((practice) => {
            practice.practiceUsers.forEach((pu) => {
              if (pu.role === 'provider') totalProviders++;
              else if (pu.role === 'biller') totalBillers++;
              else if (pu.role === 'practice_admin') totalAdmins++;
            });
          });

          // Get last activity date (latest encounter or training)
          const latestEncounter = await prisma.encounter.findFirst({
            where: {
              practiceId: { in: practiceIds },
            },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
          });

          const latestTraining = await prisma.trainingAttempt.findFirst({
            where: {
              user: {
                practiceId: { in: practiceIds },
              },
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });

          let lastActivityAt: string | null = null;
          if (latestEncounter && latestTraining) {
            lastActivityAt =
              latestEncounter.updatedAt > latestTraining.createdAt
                ? latestEncounter.updatedAt.toISOString()
                : latestTraining.createdAt.toISOString();
          } else if (latestEncounter) {
            lastActivityAt = latestEncounter.updatedAt.toISOString();
          } else if (latestTraining) {
            lastActivityAt = latestTraining.createdAt.toISOString();
          }

          // Get NPS data (aggregate across all practices in org)
          const npsResponses = await prisma.practiceNpsResponse.findMany({
            where: {
              practiceId: { in: practiceIds },
              createdAt: {
                gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
              },
            },
          });

          let nps: { averageScore: number | null; responsesCount: number } | null = null;
          if (npsResponses.length > 0) {
            const avgScore =
              npsResponses.reduce((sum, r) => sum + r.score, 0) / npsResponses.length;
            nps = {
              averageScore: Math.round(avgScore * 10) / 10, // Round to 1 decimal
              responsesCount: npsResponses.length,
            };
          }

          return {
            orgId: org.id,
            orgName: org.name,
            status: subscription.status,
            planType: subscription.planType,
            billingCycle: subscription.billingCycle,
            practicesCount: org.practices.length,
            totalProviders,
            totalBillers,
            totalAdmins,
            usage: {
              periodStart: periodStart.toISOString(),
              periodEnd: periodEnd.toISOString(),
              encountersWithAiSuggestions: totalEncountersWithAiSuggestions,
              encountersFinalized: totalEncountersFinalized,
              trainingAttempts: totalTrainingAttempts,
              aiCalls: totalAiCalls,
              lastActivityAt,
            },
            nps,
          };
        })
      );

      // Filter out nulls (orgs that didn't match filters)
      const filteredOrgs = orgsWithUsage.filter((org) => org !== null);

      logInfo('HQ overview accessed', { userId: req.user!.id, orgCount: filteredOrgs.length });

      return res.json({ organizations: filteredOrgs });
    } catch (error: any) {
      console.error('Error fetching HQ overview:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch HQ overview' });
    }
  }
);

/**
 * GET /api/hq/orgs/:orgId
 * Returns detailed information about a specific organization
 */
hqRouter.get(
  '/orgs/:orgId',
  requireAuth,
  requirePlatformAdmin,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { orgId } = req.params;

      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
        include: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          practices: {
            include: {
              practiceUsers: {
                where: {
                  status: 'ACTIVE',
                },
              },
            },
          },
        },
      });

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const subscription = organization.subscriptions[0] || null;
      if (!subscription) {
        return res.status(404).json({ error: 'No subscription found for this organization' });
      }

      // Get current period
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Process each practice
      const practicesWithUsage = await Promise.all(
        organization.practices.map(async (practice) => {
          // Count users by role
          let providerCount = 0;
          let billerCount = 0;
          let adminCount = 0;

          practice.practiceUsers.forEach((pu) => {
            if (pu.role === 'provider') providerCount++;
            else if (pu.role === 'biller') billerCount++;
            else if (pu.role === 'practice_admin') adminCount++;
          });

          // Get usage for current period
          const usagePeriod = await prisma.usagePeriod.findFirst({
            where: {
              practiceId: practice.id,
              periodStart: { lte: now },
              periodEnd: { gte: now },
            },
          });

          // Get last activity
          const latestEncounter = await prisma.encounter.findFirst({
            where: { practiceId: practice.id },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
          });

          const latestTraining = await prisma.trainingAttempt.findFirst({
            where: {
              user: {
                practiceId: practice.id,
              },
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });

          let lastActivityAt: string | null = null;
          if (latestEncounter && latestTraining) {
            lastActivityAt =
              latestEncounter.updatedAt > latestTraining.createdAt
                ? latestEncounter.updatedAt.toISOString()
                : latestTraining.createdAt.toISOString();
          } else if (latestEncounter) {
            lastActivityAt = latestEncounter.updatedAt.toISOString();
          } else if (latestTraining) {
            lastActivityAt = latestTraining.createdAt.toISOString();
          }

          return {
            id: practice.id,
            name: practice.name,
            specialty: practice.specialty,
            timeZone: practice.timeZone,
            providerCount,
            billerCount,
            adminCount,
            usage: {
              periodStart: usagePeriod?.periodStart.toISOString() || periodStart.toISOString(),
              periodEnd: usagePeriod?.periodEnd.toISOString() || periodEnd.toISOString(),
              encountersWithAiSuggestions: usagePeriod?.encountersWithAiSuggestions || 0,
              encountersFinalized: usagePeriod?.encountersFinalized || 0,
              trainingAttempts: usagePeriod?.trainingAttempts || 0,
              aiCalls: usagePeriod?.aiCalls || 0,
              lastActivityAt,
            },
          };
        })
      );

      // Get NPS data for all practices in org
      const practiceIds = organization.practices.map((p) => p.id);
      const npsResponses = await prisma.practiceNpsResponse.findMany({
        where: {
          practiceId: { in: practiceIds },
        },
        orderBy: { createdAt: 'desc' },
        take: 10, // Latest 10 comments
      });

      let nps: {
        averageScore: number | null;
        responsesCount: number;
        latestComments: Array<{
          id: string;
          score: number;
          comment: string | null;
          createdAt: string;
        }>;
      } | null = null;

      if (npsResponses.length > 0) {
        const allResponses = await prisma.practiceNpsResponse.findMany({
          where: {
            practiceId: { in: practiceIds },
          },
        });

        const avgScore = allResponses.reduce((sum, r) => sum + r.score, 0) / allResponses.length;

        nps = {
          averageScore: Math.round(avgScore * 10) / 10,
          responsesCount: allResponses.length,
          latestComments: npsResponses.map((r) => ({
            id: r.id,
            score: r.score,
            comment: r.comment,
            createdAt: r.createdAt.toISOString(),
          })),
        };
      }

      logInfo('HQ org detail accessed', { userId: req.user!.id, orgId });

      return res.json({
        org: {
          id: organization.id,
          name: organization.name,
          status: subscription.status,
          planType: subscription.planType,
          billingCycle: subscription.billingCycle,
          startDate: subscription.startDate.toISOString(),
          renewalDate: subscription.renewalDate?.toISOString() || null,
        },
        practices: practicesWithUsage,
        nps,
      });
    } catch (error: any) {
      console.error('Error fetching HQ org detail:', error);
      return res.status(500).json({ error: error.message || 'Failed to fetch org detail' });
    }
  }
);

