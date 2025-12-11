import { Router } from 'express';
import { EncounterStatus } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';
import { prisma } from '../db/client';
import {
  decodeFinalDiagnosisJson,
  decodeFinalProceduresJson,
} from '../utils/encounterCodes';
import { ensureExportsAllowed } from '../services/entitlementService';

export const exportsRouter = Router();

interface EncounterExportRow {
  encounterId: string;
  practiceId: string;
  providerId: string;
  patientPseudoId: string;
  encounterDate: string;
  visitType: string;
  specialty: string;
  status: string;
  aiEmSuggested?: string | null;
  aiEmConfidence?: number | null;
  aiDiagnosisCodes?: string;
  aiProcedureCodes?: string;
  finalEmCode?: string | null;
  finalDiagnosisCodes?: string;
  finalProcedureCodes?: string;
  denialRiskLevel?: string | null;
  denialRiskReasons?: string;
  hadUndercodeHint?: boolean;
  hadMissedServiceHint?: boolean;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
}

function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function arrayToCsvRow(values: any[]): string {
  return values.map(escapeCsvValue).join(',');
}

// GET /api/exports/encounters (biller/admin only)
exportsRouter.get('/encounters', requireAuth, requireRole(['biller', 'practice_admin', 'platform_admin']), async (req: AuthenticatedRequest, res) => {
  try {
    // Check entitlement
    try {
      await ensureExportsAllowed(req.user!.practiceId);
    } catch (err: any) {
      if (err.code === 'PLAN_NO_EXPORTS') {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }

    const { fromDate, toDate, status, format = 'csv' } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required' });
    }

    const fromDateObj = new Date(fromDate as string);
    const toDateObj = new Date(toDate as string);

    if (isNaN(fromDateObj.getTime()) || isNaN(toDateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const where: any = {
      practiceId: req.user!.practiceId,
      encounterDate: {
        gte: fromDateObj,
        lte: toDateObj,
      },
    };

    if (status) {
      where.status = status as EncounterStatus;
    }

    const encounters = await prisma.encounter.findMany({
      where,
      select: {
        id: true,
        practiceId: true,
        providerId: true,
        patientPseudoId: true,
        encounterDate: true,
        visitType: true,
        specialty: true,
        status: true,
        aiEmSuggested: true,
        aiEmConfidence: true,
        aiDiagnosisSuggestionsJson: true,
        aiProcedureSuggestionsJson: true,
        finalEmCode: true,
        finalDiagnosisJson: true,
        finalProceduresJson: true,
        denialRiskLevel: true,
        denialRiskReasons: true,
        hadUndercodeHint: true,
        hadMissedServiceHint: true,
        createdAt: true,
        updatedAt: true,
        finalizedAt: true,
      },
      orderBy: {
        encounterDate: 'desc',
      },
    });

    // Map to export rows
    const rows: EncounterExportRow[] = encounters.map((enc) => {
      // Extract AI diagnosis codes
      let aiDiagnosisCodes: string | undefined;
      if (enc.aiDiagnosisSuggestionsJson) {
        const aiDiag = Array.isArray(enc.aiDiagnosisSuggestionsJson)
          ? enc.aiDiagnosisSuggestionsJson
          : JSON.parse(enc.aiDiagnosisSuggestionsJson as string);
        if (Array.isArray(aiDiag)) {
          aiDiagnosisCodes = aiDiag.map((d: any) => d.code).filter(Boolean).join(';');
        }
      }

      // Extract AI procedure codes
      let aiProcedureCodes: string | undefined;
      if (enc.aiProcedureSuggestionsJson) {
        const aiProc = Array.isArray(enc.aiProcedureSuggestionsJson)
          ? enc.aiProcedureSuggestionsJson
          : JSON.parse(enc.aiProcedureSuggestionsJson as string);
        if (Array.isArray(aiProc)) {
          aiProcedureCodes = aiProc.map((p: any) => p.code).filter(Boolean).join(';');
        }
      }

      // Extract final diagnosis codes
      const finalDiag = decodeFinalDiagnosisJson(enc.finalDiagnosisJson);
      const finalDiagnosisCodes =
        finalDiag.length > 0 ? finalDiag.map((d) => d.code).join(';') : undefined;

      // Extract final procedure codes
      const finalProc = decodeFinalProceduresJson(enc.finalProceduresJson);
      const finalProcedureCodes =
        finalProc.length > 0 ? finalProc.map((p) => p.code).join(';') : undefined;

      // Join denial risk reasons
      const denialRiskReasons = Array.isArray(enc.denialRiskReasons)
        ? enc.denialRiskReasons.join('; ')
        : enc.denialRiskReasons
        ? String(enc.denialRiskReasons)
        : undefined;

      return {
        encounterId: enc.id,
        practiceId: enc.practiceId,
        providerId: enc.providerId,
        patientPseudoId: enc.patientPseudoId,
        encounterDate: enc.encounterDate.toISOString(),
        visitType: enc.visitType,
        specialty: enc.specialty,
        status: enc.status,
        aiEmSuggested: enc.aiEmSuggested,
        aiEmConfidence: enc.aiEmConfidence,
        aiDiagnosisCodes,
        aiProcedureCodes,
        finalEmCode: enc.finalEmCode,
        finalDiagnosisCodes,
        finalProcedureCodes,
        denialRiskLevel: enc.denialRiskLevel,
        denialRiskReasons,
        hadUndercodeHint: enc.hadUndercodeHint,
        hadMissedServiceHint: enc.hadMissedServiceHint,
        createdAt: enc.createdAt.toISOString(),
        updatedAt: enc.updatedAt.toISOString(),
        finalizedAt: enc.finalizedAt?.toISOString() || null,
      };
    });

    if (format === 'json') {
      return res.json(rows);
    }

    // CSV format
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No encounters found for the specified date range' });
    }

    const headers = Object.keys(rows[0]);
    const csvLines = [
      arrayToCsvRow(headers),
      ...rows.map((row) => arrayToCsvRow(headers.map((h) => (row as any)[h]))),
    ];

    const csvContent = csvLines.join('\n');

    const fromDateStr = fromDateObj.toISOString().split('T')[0];
    const toDateStr = toDateObj.toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="encounters_export_${fromDateStr}_${toDateStr}.csv"`
    );
    return res.send(csvContent);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to export encounters' });
  }
});

