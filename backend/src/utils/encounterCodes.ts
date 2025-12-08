export type FinalDiagnosisCode = {
  code: string;
  description: string;
  source: 'ai' | 'user';
};

export type FinalProcedureCode = {
  code: string;
  description: string;
  modifiers?: string[];
  source: 'ai' | 'user';
};

export function decodeFinalDiagnosisJson(json: any | null): FinalDiagnosisCode[] {
  if (!json || !Array.isArray(json)) {
    return [];
  }
  return json as FinalDiagnosisCode[];
}

export function encodeFinalDiagnosisJson(
  codes: FinalDiagnosisCode[] | undefined | null
): any {
  if (!codes || !Array.isArray(codes)) {
    return [];
  }
  return codes;
}

export function decodeFinalProceduresJson(json: any | null): FinalProcedureCode[] {
  if (!json || !Array.isArray(json)) {
    return [];
  }
  return json as FinalProcedureCode[];
}

export function encodeFinalProceduresJson(
  codes: FinalProcedureCode[] | undefined | null
): any {
  if (!codes || !Array.isArray(codes)) {
    return [];
  }
  return codes;
}

export interface CodeDiffs {
  addedDiagnoses: FinalDiagnosisCode[];
  removedDiagnoses: FinalDiagnosisCode[];
  changedProcedures: { before: FinalProcedureCode; after: FinalProcedureCode }[];
  emCodeChanged: { from: string | null; to: string | null } | null;
}

export function computeCodeDiffs(args: {
  prevDiag: FinalDiagnosisCode[];
  nextDiag: FinalDiagnosisCode[];
  prevProc: FinalProcedureCode[];
  nextProc: FinalProcedureCode[];
  prevEmCode?: string | null;
  nextEmCode?: string | null;
}): CodeDiffs {
  const { prevDiag, nextDiag, prevProc, nextProc, prevEmCode, nextEmCode } = args;

  // Find added diagnoses (in next but not in prev)
  const prevDiagCodes = new Set(prevDiag.map((d) => d.code));
  const addedDiagnoses = nextDiag.filter((d) => !prevDiagCodes.has(d.code));

  // Find removed diagnoses (in prev but not in next)
  const nextDiagCodes = new Set(nextDiag.map((d) => d.code));
  const removedDiagnoses = prevDiag.filter((d) => !nextDiagCodes.has(d.code));

  // Find changed procedures
  const changedProcedures: { before: FinalProcedureCode; after: FinalProcedureCode }[] = [];
  const prevProcMap = new Map(prevProc.map((p) => [p.code, p]));
  const nextProcMap = new Map(nextProc.map((p) => [p.code, p]));

  // Check for procedures that exist in both but changed
  for (const [code, prevProcItem] of prevProcMap.entries()) {
    const nextProcItem = nextProcMap.get(code);
    if (nextProcItem) {
      // Compare modifiers and description
      const prevModifiers = (prevProcItem.modifiers || []).sort().join(',');
      const nextModifiers = (nextProcItem.modifiers || []).sort().join(',');
      if (
        prevProcItem.description !== nextProcItem.description ||
        prevModifiers !== nextModifiers ||
        prevProcItem.source !== nextProcItem.source
      ) {
        changedProcedures.push({ before: prevProcItem, after: nextProcItem });
      }
    }
  }

  // Check E/M code change
  const emCodeChanged =
    prevEmCode !== nextEmCode
      ? { from: prevEmCode || null, to: nextEmCode || null }
      : null;

  return {
    addedDiagnoses,
    removedDiagnoses,
    changedProcedures,
    emCodeChanged,
  };
}

