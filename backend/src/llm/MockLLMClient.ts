import { LLMClient } from './LLMClient';
import { EncounterSuggestionsResult } from '../types/aiSuggestions';

export class MockLLMClient implements LLMClient {
  async generateEncounterSuggestions(input: {
    noteText: string;
    visitType: string;
    specialty: string;
  }): Promise<EncounterSuggestionsResult> {
    const text = input.noteText.toLowerCase();
    const hasDiabetes = text.includes('diabetes') || text.includes('metformin');
    const hasHypertension = text.includes('hypertension') || text.includes('bp ');

    const diagnoses = [];
    if (hasDiabetes) {
      diagnoses.push({
        code: 'E11.9',
        description: 'Type 2 diabetes mellitus without complications',
        confidence: 0.9,
        noteSnippets: ['Mention of diabetes or metformin in note'],
      });
    }
    if (hasHypertension) {
      diagnoses.push({
        code: 'I10',
        description: 'Essential (primary) hypertension',
        confidence: 0.85,
        noteSnippets: ['Mention of hypertension or blood pressure in note'],
      });
    }

    const emSuggested = '99213';
    const emConfidence = 0.8;

    const procedures = text.includes('b12')
      ? [
          {
            code: 'J3420',
            description: 'Injection, vitamin B12 (cyanocobalamin), up to 1,000 mcg',
            confidence: 0.88,
            noteSnippets: ['B12 injection mentioned in note'],
            withinCuratedSet: true,
          },
        ]
      : [];

    return {
      emSuggested,
      emAlternatives: [
        { code: '99212', label: 'lower complexity', recommended: false },
        { code: emSuggested, label: 'recommended', recommended: true },
      ],
      emConfidence,
      diagnoses,
      procedures,
      confidenceBucket: emConfidence >= 0.8 ? 'high' : emConfidence >= 0.5 ? 'medium' : 'low',
      denialRiskLevel: 'low',
      denialRiskReasons: ['No obvious denial risks detected based on the current documentation.'],
      hadUndercodeHint: true,
      hadMissedServiceHint: procedures.length > 0,
    };
  }
}

