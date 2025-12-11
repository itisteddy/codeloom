import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { createPracticeWithAdmin, inviteUserToPractice } from '../services/onboardingService';
import { UserRole } from '@prisma/client';

export const onboardingRouter = Router();

// POST /api/admin/onboarding/practice - create new practice with admin (admin only, or public for initial setup)
onboardingRouter.post('/practice', async (req, res) => {
  try {
    const { practiceName, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

    if (!practiceName || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
      return res.status(400).json({
        error: 'Missing required fields: practiceName, adminEmail, adminPassword, adminFirstName, adminLastName',
      });
    }

    const result = await createPracticeWithAdmin({
      practiceName,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error creating practice:', error);
    return res.status(500).json({ error: error.message || 'Failed to create practice' });
  }
});

// POST /api/admin/onboarding/invite - invite user to practice (admin only)
onboardingRouter.post(
  '/invite',
  requireAuth,
  requireRole(['practice_admin', 'platform_admin']),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({
          error: 'Missing required fields: email, password, firstName, lastName, role',
        });
      }

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({
          error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`,
        });
      }

      const result = await inviteUserToPractice(req.user!.practiceId, {
        email,
        password,
        firstName,
        lastName,
        role,
      });

      return res.status(201).json(result);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      // eslint-disable-next-line no-console
      console.error('Error inviting user:', error);
      return res.status(500).json({ error: error.message || 'Failed to invite user' });
    }
  }
);

