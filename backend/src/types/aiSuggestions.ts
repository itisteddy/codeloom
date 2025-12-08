export interface AiDiagnosisSuggestion {
  code: string;
  description: string;
  confidence: number; // 0–1
  noteSnippets: string[];
}

export interface AiProcedureSuggestion {
  code: string;
  description: string;
  confidence: number; // 0–1
  noteSnippets: string[];
  withinCuratedSet: boolean;
}

export interface EmAlternative {
  code: string;
  label: string; // e.g. "lower complexity", "recommended"
  recommended: boolean;
}

export type ConfidenceBucket = 'low' | 'medium' | 'high';

export interface EncounterSuggestionsResult {
  emSuggested: string | null;
  emAlternatives: EmAlternative[];
  emConfidence: number | null;
  diagnoses: AiDiagnosisSuggestion[];
  procedures: AiProcedureSuggestion[];
  confidenceBucket: ConfidenceBucket | null;
  denialRiskLevel: 'low' | 'medium' | 'high' | null;
  denialRiskReasons: string[];
  hadUndercodeHint: boolean;
  hadMissedServiceHint: boolean;
}

