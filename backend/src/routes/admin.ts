import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db/client';
import { plans, config } from '../config';
import { UserRole } from '@prisma/client';
import crypto from 'crypto';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logError, logInfo } from '../utils/logger';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// Middleware to require admin role
function requireAdminRole(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Admin role required' });
  }
  next();
}

// GET /admin/billing - Get practice billing/plan info
router.get('/billing', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user!.practiceId;

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
    });

    if (!practice) {
      return res.status(404).json({ error: 'Practice not found' });
    }

    // Get current month's usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const usagePeriod = await prisma.usagePeriod.findFirst({
      where: {
        practiceId,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
    });

    // Also count encounters directly for accuracy
    const encounterCount = await prisma.encounter.count({
      where: {
        practiceId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const planConfig = plans[practice.planKey as keyof typeof plans] || plans.plan_a;

    res.json({
      planKey: practice.planKey,
      planName: planConfig.name,
      planSince: practice.planSince,
      monthlyEncounterLimit: planConfig.maxEncountersPerMonth,
      encountersThisMonth: usagePeriod?.encountersCreated ?? encounterCount,
      aiSuggestCallsThisMonth: usagePeriod?.aiSuggestCalls ?? 0,
      maxProviders: planConfig.maxProviders,
      trainingEnabled: planConfig.trainingEnabled,
      analyticsEnabled: planConfig.analyticsEnabled,
      exportsEnabled: planConfig.exportsEnabled,
    });
  } catch (err) {
    console.error('Error fetching billing info:', err);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
});

// GET /admin/team - List team members
router.get('/team', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user!.practiceId;

    const users = await prisma.user.findMany({
      where: { practiceId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get pending invites
    const pendingInvites = await prisma.userInvite.findMany({
      where: {
        practiceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      pendingInvites,
    });
  } catch (err) {
    console.error('Error fetching team:', err);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// POST /admin/team/invite - Invite a new user
router.post('/team/invite', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user!.practiceId;
    const { email, role } = req.body as { email: string; role: UserRole };

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // Check if user already exists in practice
    const existingUser = await prisma.user.findFirst({
      where: { practiceId, email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists in the practice' });
    }

    // Check for existing pending invite
    const existingInvite = await prisma.userInvite.findFirst({
      where: {
        practiceId,
        email,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'Pending invite already exists for this email' });
    }

    // Create invite token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invite = await prisma.userInvite.create({
      data: {
        practiceId,
        email,
        role,
        token,
        expiresAt,
      },
    });

    // TODO: Send invite email with link containing token
    // For now, return the invite link for manual sharing
    const inviteLink = `${config.frontendUrl}/invite/accept?token=${token}`;

    res.json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      inviteLink, // In production, this would be sent via email only
    });
  } catch (err) {
    console.error('Error creating invite:', err);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// POST /admin/team/:id/role - Change user role
router.post('/team/:id/role', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user!.practiceId;
    const userId = req.params.id;
    const { role } = req.body as { role: UserRole };

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    // Prevent self-demotion from admin
    if (userId === req.user!.id && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot demote yourself from admin role' });
    }

    const result = await prisma.user.updateMany({
      where: { id: userId, practiceId },
      data: { role },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// POST /admin/team/:id/deactivate - Deactivate user
router.post('/team/:id/deactivate', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user!.practiceId;
    const userId = req.params.id;

    // Prevent self-deactivation
    if (userId === req.user!.id) {
      return res.status(400).json({ error: 'Cannot deactivate yourself' });
    }

    const result = await prisma.user.updateMany({
      where: { id: userId, practiceId },
      data: { isActive: false },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error deactivating user:', err);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// POST /admin/team/:id/activate - Reactivate user
router.post('/team/:id/activate', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user!.practiceId;
    const userId = req.params.id;

    const result = await prisma.user.updateMany({
      where: { id: userId, practiceId },
      data: { isActive: true },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error activating user:', err);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// DELETE /admin/team/invite/:id - Cancel pending invite
router.delete('/team/invite/:id', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user!.practiceId;
    const inviteId = req.params.id;

    const result = await prisma.userInvite.deleteMany({
      where: { id: inviteId, practiceId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error canceling invite:', err);
    res.status(500).json({ error: 'Failed to cancel invite' });
  }
});

// GET /admin/security - Get PHI security settings
router.get('/security', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  const practiceId = req.user!.practiceId;
  try {
    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        phiRetentionDays: true,
        storePhiAtRest: true,
      },
    });

    if (!practice) {
      return res.status(404).json({ error: 'Practice not found' });
    }

    logInfo('Security settings retrieved', { practiceId });
    res.json({
      phiRetentionDays: practice.phiRetentionDays,
      storePhiAtRest: practice.storePhiAtRest,
    });
  } catch (err: any) {
    logError('Error fetching security settings', { practiceId, error: err.message });
    res.status(500).json({ error: 'Failed to fetch security settings' });
  }
});

// POST /admin/security - Update PHI security settings
router.post('/security', requireAdminRole, async (req: AuthenticatedRequest, res: Response) => {
  const practiceId = req.user!.practiceId;
  try {
    const { phiRetentionDays, storePhiAtRest } = req.body as {
      phiRetentionDays?: number | null;
      storePhiAtRest?: boolean;
    };

    // Validation
    if (phiRetentionDays !== undefined && phiRetentionDays !== null) {
      if (typeof phiRetentionDays !== 'number' || phiRetentionDays < 0 || phiRetentionDays > 3650) {
        return res.status(400).json({
          error: 'phiRetentionDays must be a number between 0 and 3650 (or null)',
        });
      }
    }

    if (storePhiAtRest !== undefined && typeof storePhiAtRest !== 'boolean') {
      return res.status(400).json({ error: 'storePhiAtRest must be a boolean' });
    }

    const updateData: any = {};
    if (phiRetentionDays !== undefined) {
      updateData.phiRetentionDays = phiRetentionDays;
    }
    if (storePhiAtRest !== undefined) {
      updateData.storePhiAtRest = storePhiAtRest;
    }

    const practice = await prisma.practice.update({
      where: { id: practiceId },
      data: updateData,
      select: {
        phiRetentionDays: true,
        storePhiAtRest: true,
      },
    });

    logInfo('Security settings updated', {
      practiceId,
      phiRetentionDays: practice.phiRetentionDays,
      storePhiAtRest: practice.storePhiAtRest,
    });
    res.json({
      phiRetentionDays: practice.phiRetentionDays,
      storePhiAtRest: practice.storePhiAtRest,
    });
  } catch (err: any) {
    logError('Error updating security settings', { practiceId, error: err.message });
    res.status(500).json({ error: 'Failed to update security settings' });
  }
});

export default router;

