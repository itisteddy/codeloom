import { prisma } from '../db/client';
import { getLLMClient, getModelId } from '../llm';
import { logAuditEvent } from './auditService';
import {
  AuditAction,
  ConfidenceBucket,
  DenialRiskLevel,
  EncounterStatus,
  UserRole,
} from '@prisma/client';
import { EncounterSuggestionsResult } from '../types/aiSuggestions';
import { SafetySummary } from '../llm/safetyValidators';

const MAX_NOTE_CHARS = 10000;

type EmCandidate = {
  code: string;
  level: number | null;
  confidence: number;
};

function toConfidenceBucket(conf: number | null): ConfidenceBucket | null {
  if (conf == null) return null;
  if (conf >= 0.8) return 'high';
  if (conf >= 0.5) return 'medium';
  return 'low';
}

function inferEmLevel(code: string | null): number | null {
  if (!code) return null;
  const match = code.match(/(\d)$/);
  return match ? Number(match[1]) : null;
}

function selectEmCodes(result: EncounterSuggestionsResult) {
  const candidates: EmCandidate[] = [];
  const baseConfidence = typeof result.emConfidence === 'number' ? result.emConfidence : 0;

  if (result.emSuggested) {
    candidates.push({
      code: result.emSuggested,
      level: inferEmLevel(result.emSuggested),
      confidence: baseConfidence || 0.65,
    });
  }

  if (result.emAlternatives && result.emAlternatives.length > 0) {
    for (const alt of result.emAlternatives) {
      const altConfidence =
        typeof (alt as any).confidence === 'number'
          ? (alt as any).confidence
          : Math.max(baseConfidence, alt.recommended ? 0.7 : 0.6);
      candidates.push({
        code: alt.code,
        level: inferEmLevel(alt.code),
        confidence: altConfidence,
      });
    }
  }

  const supported = candidates.filter((c) => c.level !== null && c.confidence >= 0.6);
  const recommended =
    (result.emSuggested &&
      candidates.find((c) => c.code === result.emSuggested && c.level !== null)) ||
    (supported.length > 0
      ? supported.reduce((best, c) => (c.confidence > best.confidence ? c : best), supported[0])
      : null);

  const highestSupported =
    supported.length > 0
      ? supported.reduce((best, c) => ((c.level || 0) > (best.level || 0) ? c : best), supported[0])
      : null;

  const hasUndercodeDelta =
    recommended && highestSupported && (highestSupported.level || 0) > (recommended.level || 0);

  return { recommended, highestSupported, hasUndercodeDelta };
}

export interface SuggestionResult {
  encounter: any;
  safetySummary: SafetySummary | null;
  modelId: string;
}

export async function runSuggestionsForEncounter(params: {
  encounterId: string;
  practiceId: string;
  userId: string;
  userRole: UserRole;
  llmModeOverride?: 'mock' | 'openai' | null;
}): Promise<SuggestionResult> {
  const encounter = await prisma.encounter.findFirst({
    where: { id: params.encounterId, practiceId: params.practiceId },
  });

  if (!encounter) {
    throw new Error('NOT_FOUND');
  }

  if (!encounter.noteText || encounter.noteText.trim().length === 0) {
    const err = new Error('EMPTY_NOTE');
    throw err;
  }

  let noteText = encounter.noteText;
  if (noteText.length > MAX_NOTE_CHARS) {
    // naive truncate for now; later we can prefer A/P etc.
    noteText = noteText.slice(0, MAX_NOTE_CHARS);
  }

  const llm = getLLMClient(params.llmModeOverride);
  const modelId = getModelId(params.llmModeOverride);

  let rawResult: EncounterSuggestionsResult & { __safetySummary?: SafetySummary };
  try {
    rawResult = await llm.generateEncounterSuggestions({
      noteText,
      visitType: encounter.visitType,
      specialty: encounter.specialty,
    });
  } catch (e) {
    const err = new Error('LLM_ERROR');
    // @ts-expect-error attach cause
    err.cause = e;
    throw err;
  }

  // Extract safety summary
  const safetySummary = rawResult.__safetySummary || null;
  const result: EncounterSuggestionsResult = {
    emSuggested: rawResult.emSuggested,
    emAlternatives: rawResult.emAlternatives || [],
    emConfidence: rawResult.emConfidence,
    diagnoses: rawResult.diagnoses || [],
    procedures: rawResult.procedures || [],
    confidenceBucket: rawResult.confidenceBucket,
    denialRiskLevel: rawResult.denialRiskLevel,
    denialRiskReasons: rawResult.denialRiskReasons || [],
    hadUndercodeHint: rawResult.hadUndercodeHint,
    hadMissedServiceHint: rawResult.hadMissedServiceHint,
  };

  const { recommended, highestSupported, hasUndercodeDelta } = selectEmCodes(result);

  const confidenceBucket = result.confidenceBucket ?? toConfidenceBucket(recommended?.confidence ?? null);
  const hadUndercodeHint = Boolean(result.hadUndercodeHint || hasUndercodeDelta);

  const updated = await prisma.encounter.update({
    where: { id: encounter.id },
    data: {
      aiEmSuggested: recommended?.code ?? result.emSuggested ?? undefined,
      aiEmAlternativesJson: result.emAlternatives as any,
      aiEmConfidence: recommended?.confidence ?? result.emConfidence ?? undefined,
      aiEmHighestSupportedCode: highestSupported?.code ?? undefined,
      aiEmHighestSupportedConfidence: highestSupported?.confidence ?? undefined,
      aiDiagnosisSuggestionsJson: result.diagnoses as any,
      aiProcedureSuggestionsJson: result.procedures as any,
      aiConfidenceBucket: confidenceBucket ?? undefined,
      denialRiskLevel: (result.denialRiskLevel as DenialRiskLevel | null) ?? undefined,
      denialRiskReasons: result.denialRiskReasons as any,
      hadUndercodeHint,
      hadMissedServiceHint: result.hadMissedServiceHint,
      status: EncounterStatus.ai_suggested,
    },
  });

  // Log AI_SUGGESTED_CODES event
  await logAuditEvent({
    practiceId: params.practiceId,
    encounterId: updated.id,
    userId: params.userId,
    userRole: params.userRole,
    action: AuditAction.AI_SUGGESTED_CODES,
    payload: {
      type: 'AI_SUGGESTION',
      hasEm: !!updated.aiEmSuggested,
      dxCount: result.diagnoses.length,
      procCount: result.procedures.length,
      modelId,
    },
  });

  // Log AI_SAFETY event if safety issues were detected
  if (safetySummary && (safetySummary.hadInvalidCodes || safetySummary.filteredCodesCount > 0 || safetySummary.hadFormatIssues)) {
    await logAuditEvent({
      practiceId: params.practiceId,
      encounterId: updated.id,
      userId: params.userId,
      userRole: params.userRole,
      action: AuditAction.AI_SAFETY,
      payload: {
        type: 'AI_SAFETY',
        filteredCodesCount: safetySummary.filteredCodesCount,
        hadInvalidCodes: safetySummary.hadInvalidCodes,
        hadFormatIssues: safetySummary.hadFormatIssues,
        modelId,
      },
    });
  }

  return {
    encounter: updated,
    safetySummary,
    modelId,
  };
}

