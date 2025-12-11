import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db/client';
import { signAuthToken } from '../config/auth';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { logAuditEvent } from '../services/auditService';
import { AuditAction } from '@prisma/client';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findFirst({
      where: { email },
      include: { 
        practice: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      // Log failed login attempt (no user found)
      try {
        await logAuditEvent({
          practiceId: 'unknown',
          encounterId: 'system',
          userId: 'unknown',
          userRole: 'provider',
          action: AuditAction.ENCOUNTER_UPDATED,
          payload: { type: 'SECURITY_EVENT', event: 'FAILED_LOGIN' },
        });
      } catch (auditErr) {
        // Don't fail request if audit logging fails
        console.error('Audit log error:', auditErr);
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      // Log failed login attempt (wrong password)
      try {
        await logAuditEvent({
          practiceId: user.practiceId,
          encounterId: 'system',
          userId: user.id,
          userRole: user.role,
          action: AuditAction.ENCOUNTER_UPDATED,
          payload: { type: 'SECURITY_EVENT', event: 'FAILED_LOGIN' },
        });
      } catch (auditErr) {
        // Don't fail request if audit logging fails
        console.error('Audit log error:', auditErr);
      }
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signAuthToken({
      sub: user.id,
      practiceId: user.practiceId || null, // Allow null for PLATFORM_ADMIN
      role: user.role,
    });

    const { passwordHash: _, ...safeUser } = user;

    // Get practice name for response
    const practice = user.practice;

    return res.json({
      token,
      user: {
        id: safeUser.id,
        practiceId: safeUser.practiceId || null,
        practiceName: practice?.name || null,
        role: safeUser.role,
        email: safeUser.email,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
      },
    });
  } catch (err: any) {
    console.error('Login error:', {
      message: err.message,
      stack: err.stack,
      name: err.name,
    });
    return res.status(500).json({ 
      error: 'Login failed',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { practice: true },
  });

  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { passwordHash, ...safeUser } = currentUser;

  return res.json({
    user: {
      id: safeUser.id,
      practiceId: safeUser.practiceId,
      role: safeUser.role,
      email: safeUser.email,
      firstName: safeUser.firstName,
      lastName: safeUser.lastName,
    },
  });
});

