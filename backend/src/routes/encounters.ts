import { Router } from 'express';
import { EncounterStatus } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import {
  listEncountersForPractice,
  createEncounter,
  getEncounterForPractice,
  updateEncounterMetadata,
  updateEncounterCodes,
  finalizeEncounter,
} from '../services/encounterService';
import { logAuditEvent } from '../services/auditService';
import { runSuggestionsForEncounter } from '../services/SuggestionService';
import {
  decodeFinalDiagnosisJson,
  decodeFinalProceduresJson,
  FinalDiagnosisCode,
  FinalProcedureCode,
} from '../utils/encounterCodes';
import { prisma } from '../db/client';
import { ensureEncounterInPractice } from '../services/practiceGuard';
import { ensureEncounterCreationAllowed } from '../services/entitlementService';
import { incrementUsage } from '../services/usageService';
import { getPracticeConfiguration } from '../services/practiceConfigService';
import { getPilotConfig } from '../services/pilotConfigService';
import { submitEncounterFeedback, getEncounterFeedback } from '../services/feedbackService';

export const encountersRouter = Router();

// Helper to convert encounter to DTO with decoded codes and AI fields
function toEncounterDto(encounter: any, safetySummary?: any, modelId?: string) {
  const dto: any = { ...encounter };
  // Remove raw JSON fields and add decoded arrays
  delete dto.finalDiagnosisJson;
  delete dto.finalProceduresJson;
  dto.finalDiagnosisCodes = decodeFinalDiagnosisJson(encounter.finalDiagnosisJson);
  dto.finalProcedureCodes = decodeFinalProceduresJson(encounter.finalProceduresJson);
  
  // Decode AI suggestion JSON fields
  if (encounter.aiEmAlternativesJson) {
    dto.aiEmAlternatives = encounter.aiEmAlternativesJson;
  }
  if (encounter.aiDiagnosisSuggestionsJson) {
    dto.aiDiagnosisSuggestions = encounter.aiDiagnosisSuggestionsJson;
  }
  if (encounter.aiProcedureSuggestionsJson) {
    dto.aiProcedureSuggestions = encounter.aiProcedureSuggestionsJson;
  }
  
  // Add model ID and safety summary for AI suggestions
  if (encounter.status === 'ai_suggested' || encounter.aiEmSuggested) {
    dto.aiModelId = modelId || (() => {
      const { getModelId } = require('../llm');
      return getModelId();
    })();
    if (safetySummary) {
      dto.aiSafetySummary = safetySummary;
    }
  }
  
  return dto;
}

// GET /api/encounters - list encounters
encountersRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const status = req.query.status as EncounterStatus | undefined;
    const providerId = req.query.providerId as string | undefined;
    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : undefined;
    const toDate = req.query.toDate ? new Date(req.query.toDate as string) : undefined;
    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 100);
    const offset = parseInt((req.query.offset as string) || '0', 10);

    const encounters = await listEncountersForPractice({
      practiceId: req.user!.practiceId,
      status,
      providerId,
      fromDate,
      toDate,
      limit,
      offset,
    });

    // Format response with provider name
    const formatted = encounters.map((enc: any) => ({
      id: enc.id,
      practiceId: enc.practiceId,
      providerId: enc.providerId,
      providerName: enc.provider
        ? `${enc.provider.firstName} ${enc.provider.lastName}`
        : null,
      patientPseudoId: enc.patientPseudoId,
      encounterDate: enc.encounterDate,
      visitType: enc.visitType,
      specialty: enc.specialty,
      status: enc.status,
      aiEmSuggested: enc.aiEmSuggested,
      finalEmCode: enc.finalEmCode,
      denialRiskLevel: enc.denialRiskLevel,
      createdAt: enc.createdAt,
      updatedAt: enc.updatedAt,
    }));

    return res.json(formatted);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to list encounters' });
  }
});

// POST /api/encounters - create encounter
encountersRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { encounterDate, patientPseudoId, visitType, specialty, providerId, noteText } =
      req.body;

    // Validate required fields
    if (!encounterDate || !patientPseudoId || !visitType || !specialty || !noteText) {
      return res.status(400).json({
        error: 'Missing required fields: encounterDate, patientPseudoId, visitType, specialty, noteText',
      });
    }

    // Determine providerId
    let finalProviderId = providerId;
    if (!finalProviderId) {
      if (req.user!.role === 'provider') {
        finalProviderId = req.user!.id;
      } else {
        return res.status(400).json({ error: 'providerId is required for non-provider users' });
      }
    }

    // Verify provider belongs to same practice
    const provider = await prisma.user.findFirst({
      where: {
        id: finalProviderId,
        practiceId: req.user!.practiceId,
      },
    });

    if (!provider) {
      return res.status(400).json({ error: 'Provider not found or belongs to different practice' });
    }

    // Check entitlement
    try {
      await ensureEncounterCreationAllowed(req.user!.practiceId);
    } catch (err: any) {
      if (err.code === 'PLAN_LIMIT_ENCOUNTERS') {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }

    // Check enabled specialties
    const pilotConfig = await getPilotConfig(req.user!.practiceId);
    if (
      pilotConfig.enabledSpecialties &&
      pilotConfig.enabledSpecialties.length > 0 &&
      !pilotConfig.enabledSpecialties.includes(specialty)
    ) {
      return res.status(400).json({
        error: `Specialty "${specialty}" is not enabled for this pilot. Enabled specialties: ${pilotConfig.enabledSpecialties.join(', ')}`,
      });
    }

    // Convert encounterDate to Date
    const encounterDateObj = new Date(encounterDate);

    // Create encounter
    const encounter = await createEncounter({
      practiceId: req.user!.practiceId,
      providerId: finalProviderId,
      patientPseudoId,
      encounterDate: encounterDateObj,
      visitType,
      specialty,
      noteText,
    });

    // Log audit event
    await logAuditEvent({
      practiceId: req.user!.practiceId,
      encounterId: encounter.id,
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'ENCOUNTER_CREATED',
      payload: { type: 'ENCOUNTER_CREATED', metadataOnly: true },
    });

    return res.status(201).json(toEncounterDto(encounter));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to create encounter' });
  }
});

// GET /api/encounters/:id - get encounter detail
encountersRouter.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const exists = await ensureEncounterInPractice(req.params.id, req.user!.practiceId);
    if (!exists) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    const encounter = await getEncounterForPractice(req.params.id, req.user!.practiceId);
    if (!encounter) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    return res.json(toEncounterDto(encounter));
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to get encounter' });
  }
});

// PATCH /api/encounters/:id - update metadata
encountersRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const exists = await ensureEncounterInPractice(req.params.id, req.user!.practiceId);
    if (!exists) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    const { encounterDate, patientPseudoId, visitType, specialty, noteText } = req.body;

    // Check if any known fields are provided
    const hasFields =
      encounterDate !== undefined ||
      patientPseudoId !== undefined ||
      visitType !== undefined ||
      specialty !== undefined ||
      noteText !== undefined;

    if (!hasFields) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const patch: any = {};
    if (encounterDate !== undefined) patch.encounterDate = new Date(encounterDate);
    if (patientPseudoId !== undefined) patch.patientPseudoId = patientPseudoId;
    if (visitType !== undefined) patch.visitType = visitType;
    if (specialty !== undefined) patch.specialty = specialty;
    if (noteText !== undefined) patch.noteText = noteText;

    const encounter = await updateEncounterMetadata({
      encounterId: req.params.id,
      practiceId: req.user!.practiceId,
      patch,
    });

    // Log audit event - only log status changes, not PHI fields
    const changedFields = Object.keys(patch).filter((k: string) => k !== 'noteText' && k !== 'patientPseudoId');
    if (changedFields.length > 0) {
      await logAuditEvent({
        practiceId: req.user!.practiceId,
        encounterId: encounter.id,
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'ENCOUNTER_UPDATED',
        payload: { type: 'ENCOUNTER_UPDATED', metadataOnly: true },
      });
    }

    return res.json(toEncounterDto(encounter));
  } catch (error: any) {
    if (error.message === 'Encounter not found') {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    return res.status(500).json({ error: error.message || 'Failed to update encounter' });
  }
});

// PATCH /api/encounters/:id/codes - update codes
encountersRouter.patch('/:id/codes', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const exists = await ensureEncounterInPractice(req.params.id, req.user!.practiceId);
    if (!exists) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    // Check practice configuration for provider permissions
    const config = await getPracticeConfiguration(req.user!.practiceId);
    if (req.user!.role === 'provider' && !config.providerCanEditCodes) {
      return res.status(403).json({
        error: 'Providers are not allowed to edit codes in this practice. Please contact your biller.',
      });
    }

    // Enforce role if provider can't edit codes
    if (req.user!.role === 'provider' && !config.providerCanEditCodes) {
      return res.status(403).json({
        error: 'Providers cannot edit codes in this practice',
      });
    }

    const { finalEmCode, finalEmCodeSource, finalDiagnosisCodes, finalProcedureCodes } = req.body;

    // Validate structure if provided
    if (finalDiagnosisCodes !== undefined && !Array.isArray(finalDiagnosisCodes)) {
      return res.status(400).json({ error: 'finalDiagnosisCodes must be an array' });
    }

    if (finalProcedureCodes !== undefined && !Array.isArray(finalProcedureCodes)) {
      return res.status(400).json({ error: 'finalProcedureCodes must be an array' });
    }

    const result = await updateEncounterCodes({
      encounterId: req.params.id,
      practiceId: req.user!.practiceId,
      finalEmCode,
      finalEmCodeSource,
      finalDiagnosisCodes: finalDiagnosisCodes as FinalDiagnosisCode[] | undefined,
      finalProcedureCodes: finalProcedureCodes as FinalProcedureCode[] | undefined,
    });

    const { encounter, diffs } = result;

    // Create audit events for changes using safe payloads
    if (diffs.emCodeChanged) {
      await logAuditEvent({
        practiceId: req.user!.practiceId,
        encounterId: encounter.id,
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'USER_CHANGED_EM_CODE',
        payload: {
          field: 'finalEmCode',
          from: diffs.emCodeChanged.from,
          to: diffs.emCodeChanged.to,
        },
      });
    }

    const addedDxCodes = diffs.addedDiagnoses.map((d: FinalDiagnosisCode) => d.code);
    const removedDxCodes = diffs.removedDiagnoses.map((d: FinalDiagnosisCode) => d.code);
    if (addedDxCodes.length > 0) {
      await logAuditEvent({
        practiceId: req.user!.practiceId,
        encounterId: encounter.id,
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'USER_ADDED_DIAGNOSIS',
        payload: {
          field: 'diagnosisCodes',
          added: addedDxCodes,
          removed: [],
        },
      });
    }
    if (removedDxCodes.length > 0) {
      await logAuditEvent({
        practiceId: req.user!.practiceId,
        encounterId: encounter.id,
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'USER_REMOVED_DIAGNOSIS',
        payload: {
          field: 'diagnosisCodes',
          added: [],
          removed: removedDxCodes,
        },
      });
    }

    // For procedures, log changes (changed procedures are tracked as before/after)
    if (diffs.changedProcedures.length > 0) {
      const addedProcCodes = diffs.changedProcedures.map((p: { before: FinalProcedureCode; after: FinalProcedureCode }) => p.after.code);
      const removedProcCodes = diffs.changedProcedures.map((p: { before: FinalProcedureCode; after: FinalProcedureCode }) => p.before.code);
      await logAuditEvent({
        practiceId: req.user!.practiceId,
        encounterId: encounter.id,
        userId: req.user!.id,
        userRole: req.user!.role,
        action: 'USER_CHANGED_PROCEDURE',
        payload: {
          field: 'procedureCodes',
          added: addedProcCodes,
          removed: removedProcCodes,
        },
      });
    }

    return res.json(toEncounterDto(encounter));
  } catch (error: any) {
    if (error.message === 'Encounter not found') {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    return res.status(500).json({ error: error.message || 'Failed to update codes' });
  }
});

// POST /api/encounters/:id/finalize - finalize encounter
encountersRouter.post('/:id/finalize', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const exists = await ensureEncounterInPractice(req.params.id, req.user!.practiceId);
    if (!exists) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    // Check if provider can finalize
    const pilotConfig = await getPilotConfig(req.user!.practiceId);
    if (req.user!.role === 'provider' && !pilotConfig.providerCanFinalize) {
      return res.status(403).json({
        error: 'Providers are not allowed to finalize encounters in this practice',
      });
    }

    // Enforce role if provider can't finalize
    if (req.user!.role === 'provider' && !pilotConfig.providerCanFinalize) {
      return res.status(403).json({
        error: 'Only billers and administrators can finalize encounters',
      });
    }

    const encounter = await finalizeEncounter({
      encounterId: req.params.id,
      practiceId: req.user!.practiceId,
      finalizedByUserId: req.user!.id,
    });

    // Log audit event
    const diagnoses = decodeFinalDiagnosisJson(encounter.finalDiagnosisJson);
    const procedures = decodeFinalProceduresJson(encounter.finalProceduresJson);

    await logAuditEvent({
      practiceId: req.user!.practiceId,
      encounterId: encounter.id,
      userId: req.user!.id,
      userRole: req.user!.role,
      action: 'USER_FINALIZED_CODES',
      payload: {
        field: 'status',
        from: encounter.status === 'finalized' ? 'ai_suggested' : 'draft',
        to: 'finalized',
      },
    });

    return res.json(toEncounterDto(encounter));
  } catch (error: any) {
    if (error.message === 'Encounter not found') {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    if (
      error.message.includes('required') ||
      error.message.includes('at least one diagnosis')
    ) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Failed to finalize encounter' });
  }
});

// POST /api/encounters/:id/suggest - generate AI suggestions
encountersRouter.post('/:id/suggest', requireAuth, async (req: AuthenticatedRequest, res) => {
  const encounterId = req.params.id;
  const { practiceId, id: userId, role } = req.user!;

  try {
    const exists = await ensureEncounterInPractice(encounterId, practiceId);
    if (!exists) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    // Load practice LLM mode override
    const pilotConfig = await getPilotConfig(practiceId);
    const result = await runSuggestionsForEncounter({
      encounterId,
      practiceId,
      userId,
      userRole: role,
      llmModeOverride: pilotConfig.llmModeOverride as 'mock' | 'openai' | null | undefined,
    });

    // Increment usage
    await incrementUsage(practiceId, 'aiSuggestCalls');

    const dto = toEncounterDto(result.encounter, result.safetySummary, result.modelId);
    return res.json(dto);
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    if (e.message === 'EMPTY_NOTE') {
      return res
        .status(400)
        .json({ error: 'Encounter note is empty. Please add a note before running suggestions.' });
    }
    if (e.message === 'LLM_ERROR') {
      // eslint-disable-next-line no-console
      console.error('LLM error while generating suggestions', e.cause || e);
      return res
        .status(502)
        .json({ error: 'Unable to generate suggestions at this time. Please try again.' });
    }
    // eslint-disable-next-line no-console
    console.error('Unexpected error in /encounters/:id/suggest', e);
    return res.status(500).json({ error: 'Unexpected error' });
  }
});

// GET /api/encounters/:id/audit - get audit trail (biller/admin only)
encountersRouter.get('/:id/audit', requireAuth, requireRole(['biller', 'admin']), async (req: AuthenticatedRequest, res) => {
  try {
    const encounterId = req.params.id;
    const { practiceId } = req.user!;

    const exists = await ensureEncounterInPractice(encounterId, practiceId);
    if (!exists) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    const events = await prisma.auditEvent.findMany({
      where: { encounterId, practiceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    const dto = events.map((e: any) => ({
      id: e.id,
      action: e.action,
      userId: e.userId,
      userRole: e.userRole,
      userName: `${e.user.firstName} ${e.user.lastName}`,
      createdAt: e.createdAt.toISOString(),
      payload: e.payload,
    }));

    return res.json(dto);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to fetch audit trail' });
  }
});

// POST /api/encounters/:id/feedback - submit feedback for an encounter
encountersRouter.post('/:id/feedback', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const encounterId = req.params.id;
    const { helpful, comment } = req.body;

    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'Missing or invalid field: helpful (must be boolean)' });
    }

    // Verify encounter belongs to practice
    const exists = await ensureEncounterInPractice(encounterId, req.user!.practiceId);
    if (!exists) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    await submitEncounterFeedback(
      encounterId,
      req.user!.id,
      req.user!.role,
      req.user!.practiceId,
      {
        helpful,
        comment: comment || null,
      }
    );

    return res.json({ success: true });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error submitting feedback:', error);
    return res.status(500).json({ error: error.message || 'Failed to submit feedback' });
  }
});

// GET /api/encounters/:id/feedback - get feedback for an encounter
encountersRouter.get('/:id/feedback', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const encounterId = req.params.id;

    // Verify encounter belongs to practice
    const exists = await ensureEncounterInPractice(encounterId, req.user!.practiceId);
    if (!exists) {
      return res.status(404).json({ error: 'Encounter not found' });
    }

    const feedback = await getEncounterFeedback(encounterId, req.user!.id);

    if (!feedback) {
      return res.json(null);
    }

    return res.json({
      helpful: feedback.helpful,
      comment: feedback.comment,
      createdAt: feedback.createdAt.toISOString(),
    });
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error('Error getting feedback:', error);
    return res.status(500).json({ error: error.message || 'Failed to get feedback' });
  }
});

