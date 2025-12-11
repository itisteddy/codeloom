/**
 * /api/me routes - Current user profile and settings
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logInfo, logError } from '../utils/logger';

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// GET /api/me - Get current user info
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { getCurrentUser, getCurrentPractice, getCurrentOrg } = await import('../utils/tenancy');
    
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const practice = await getCurrentPractice(req);
    const org = await getCurrentOrg(req);

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      practiceId: practice?.id || user.practiceId || null,
      practiceName: practice?.name || null,
      orgId: org?.id || null,
      orgName: org?.name || null,
    });
  } catch (err: any) {
    logError('Error fetching current user', { userId: req.user!.id, error: err.message });
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

// GET /api/me/settings - Get user preferences
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return preferences with defaults if none exist
    const prefs = user.preferences || {
      theme: 'system',
      timeZone: null,
      dateFormat: 'MM/DD/YYYY',
      notificationPrefs: { emailAssignments: true, emailWeeklySummary: false },
      providerPrefs: {},
      billerPrefs: {},
      adminPrefs: {},
    };

    res.json({
      theme: prefs.theme,
      timeZone: prefs.timeZone,
      dateFormat: prefs.dateFormat,
      notificationPrefs: prefs.notificationPrefs || { emailAssignments: true, emailWeeklySummary: false },
      // Return role-specific prefs based on user's role
      rolePrefs: user.role === 'provider' ? prefs.providerPrefs :
                 user.role === 'biller' ? prefs.billerPrefs :
                 prefs.adminPrefs,
    });
  } catch (err: any) {
    logError('Error fetching user settings', { userId: req.user!.id, error: err.message });
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/me/settings - Update user preferences
router.put('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { theme, timeZone, dateFormat, notificationPrefs, rolePrefs } = req.body as {
      theme?: string;
      timeZone?: string | null;
      dateFormat?: string;
      notificationPrefs?: Record<string, boolean>;
      rolePrefs?: Record<string, unknown>;
    };

    // Validate theme
    if (theme && !['light', 'dark', 'system'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme value' });
    }

    // Validate dateFormat
    if (dateFormat && !['MM/DD/YYYY', 'DD/MM/YYYY'].includes(dateFormat)) {
      return res.status(400).json({ error: 'Invalid dateFormat value' });
    }

    // Get current user and preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preferences: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update data
    const updateData: any = {};
    if (theme !== undefined) updateData.theme = theme;
    if (timeZone !== undefined) updateData.timeZone = timeZone;
    if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
    if (notificationPrefs !== undefined) updateData.notificationPrefs = notificationPrefs;

    // Handle role-specific prefs
    if (rolePrefs !== undefined) {
      if (user.role === 'provider') {
        updateData.providerPrefs = rolePrefs;
      } else if (user.role === 'biller') {
        updateData.billerPrefs = rolePrefs;
      } else {
        updateData.adminPrefs = rolePrefs;
      }
    }

    // Upsert preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        ...updateData,
      },
      update: updateData,
    });

    logInfo('User settings updated', { userId });

    res.json({
      theme: preferences.theme,
      timeZone: preferences.timeZone,
      dateFormat: preferences.dateFormat,
      notificationPrefs: preferences.notificationPrefs || { emailAssignments: true, emailWeeklySummary: false },
      rolePrefs: user.role === 'provider' ? preferences.providerPrefs :
                 user.role === 'biller' ? preferences.billerPrefs :
                 preferences.adminPrefs,
    });
  } catch (err: any) {
    logError('Error updating user settings', { userId: req.user!.id, error: err.message });
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// PUT /api/me/profile - Update user profile (name)
router.put('/profile', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName } = req.body as {
      firstName?: string;
      lastName?: string;
    };

    // Validate inputs
    if (firstName !== undefined && (typeof firstName !== 'string' || firstName.length === 0)) {
      return res.status(400).json({ error: 'Invalid firstName' });
    }
    if (lastName !== undefined && (typeof lastName !== 'string' || lastName.length === 0)) {
      return res.status(400).json({ error: 'Invalid lastName' });
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    logInfo('User profile updated', { userId });

    res.json(user);
  } catch (err: any) {
    logError('Error updating user profile', { userId: req.user!.id, error: err.message });
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/me/change-password - Change password
router.post('/change-password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    logInfo('User password changed', { userId });

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err: any) {
    logError('Error changing password', { userId: req.user!.id, error: err.message });
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;

