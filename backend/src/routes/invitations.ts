import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { createInvite, listInvites } from '../services/invitationService';
import { UserRole } from '@prisma/client';

export const invitationsRouter = Router();

// POST /api/admin/practices/:id/invites - create invite (admin only)
invitationsRouter.post(
  '/:id/invites',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const practiceId = req.params.id;

      // Verify practice belongs to user
      if (practiceId !== req.user!.practiceId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { email, role } = req.body;

      if (!email || !role) {
        return res.status(400).json({ error: 'Missing required fields: email, role' });
      }

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`,
        });
      }

      const invite = await createInvite(practiceId, { email, role });
      return res.status(201).json(invite);
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('active invite')) {
        return res.status(409).json({ error: error.message });
      }
      // eslint-disable-next-line no-console
      console.error('Error creating invite:', error);
      return res.status(500).json({ error: error.message || 'Failed to create invite' });
    }
  }
);

// GET /api/admin/practices/:id/invites - list invites (admin only)
invitationsRouter.get(
  '/:id/invites',
  requireAuth,
  requireRole(['admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const practiceId = req.params.id;

      // Verify practice belongs to user
      if (practiceId !== req.user!.practiceId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const invites = await listInvites(practiceId);
      return res.json(invites);
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('Error listing invites:', error);
      return res.status(500).json({ error: error.message || 'Failed to list invites' });
    }
  }
);

