import { Router } from 'express';
import { prisma } from '../db/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

export const practicesRouter = Router();

practicesRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const practice = await prisma.practice.findUnique({
    where: { id: req.user!.practiceId },
  });

  if (!practice) {
    return res.status(404).json({ error: 'Practice not found' });
  }

  return res.json({
    id: practice.id,
    name: practice.name,
    createdAt: practice.createdAt,
  });
});

