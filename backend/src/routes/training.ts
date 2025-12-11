import { Router } from 'express';
import { TrainingDifficulty } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import {
  listTrainingCases,
  getTrainingCaseById,
  submitTrainingAttempt,
} from '../services/trainingService';
import { ensureTrainingAllowed } from '../services/entitlementService';
import { incrementUsage } from '../services/usageService';

export const trainingRouter = Router();

// GET /api/training/cases - list training cases
trainingRouter.get('/cases', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const specialty = req.query.specialty as string | undefined;
    const difficulty = req.query.difficulty as TrainingDifficulty | undefined;

    const cases = await listTrainingCases({ specialty, difficulty });

    const dto = cases.map((c) => ({
      id: c.id,
      title: c.title,
      specialty: c.specialty,
      difficulty: c.difficulty,
      createdAt: c.createdAt.toISOString(),
    }));

    return res.json(dto);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list training cases' });
  }
});

// GET /api/training/cases/:id - get training case detail
trainingRouter.get('/cases/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const case_ = await getTrainingCaseById(req.params.id);

    if (!case_) {
      return res.status(404).json({ error: 'Training case not found' });
    }

    const dto = {
      id: case_.id,
      title: case_.title,
      specialty: case_.specialty,
      difficulty: case_.difficulty,
      noteText: case_.noteText,
      createdAt: case_.createdAt.toISOString(),
    };

    return res.json(dto);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to get training case' });
  }
});

// POST /api/training/cases/:id/attempt - submit training attempt
trainingRouter.post('/cases/:id/attempt', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { userEmCode, userDiagnosisCodes, userProcedureCodes } = req.body;

    // Validate input
    if (!userEmCode || typeof userEmCode !== 'string' || userEmCode.trim().length === 0) {
      return res.status(400).json({ error: 'userEmCode is required' });
    }

    if (!Array.isArray(userDiagnosisCodes)) {
      return res.status(400).json({ error: 'userDiagnosisCodes must be an array' });
    }

    if (!Array.isArray(userProcedureCodes)) {
      return res.status(400).json({ error: 'userProcedureCodes must be an array' });
    }

    const practiceId = req.user!.practiceId;
    if (!practiceId) {
      return res.status(403).json({ error: 'Practice context required' });
    }

    // Check entitlement
    try {
      await ensureTrainingAllowed(practiceId);
    } catch (err: any) {
      if (err.code === 'PLAN_NO_TRAINING') {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }

    const result = await submitTrainingAttempt({
      caseId: req.params.id,
      userId: req.user!.id,
      userEmCode: userEmCode.trim(),
      userDiagnosisCodes: userDiagnosisCodes.map((c: string) => String(c).trim()).filter(Boolean),
      userProcedureCodes: userProcedureCodes.map((c: string) => String(c).trim()).filter(Boolean),
    });

    // Increment usage
    await incrementUsage(practiceId, 'trainingAttempts');

    return res.json(result);
  } catch (error: any) {
    if (error.message === 'CASE_NOT_FOUND') {
      return res.status(404).json({ error: 'Training case not found' });
    }
    if (error.code === 'PLAN_NO_TRAINING') {
      return res.status(403).json({ error: error.message });
    }
    // eslint-disable-next-line no-console
    console.error('Error submitting training attempt', error);
    return res.status(500).json({ error: error.message || 'Failed to submit training attempt' });
  }
});

