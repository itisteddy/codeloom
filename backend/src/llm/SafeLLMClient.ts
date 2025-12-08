import { LLMClient } from './LLMClient';
import { EncounterSuggestionsResult } from '../types/aiSuggestions';
import { validateAndCleanSuggestions, SafetySummary } from './safetyValidators';

export class SafeLLMClient implements LLMClient {
  constructor(
    private primary: LLMClient,
    private fallback?: LLMClient
  ) {}

  async generateEncounterSuggestions(input: {
    noteText: string;
    visitType: string;
    specialty: string;
  }): Promise<EncounterSuggestionsResult & { __safetySummary?: SafetySummary }> {
    let raw: EncounterSuggestionsResult;
    let usedFallback = false;

    try {
      raw = await this.primary.generateEncounterSuggestions(input);
    } catch (e) {
      if (!this.fallback) {
        throw e;
      }
      // Use fallback
      raw = await this.fallback.generateEncounterSuggestions(input);
      usedFallback = true;
    }

    const { cleaned, safetySummary } = validateAndCleanSuggestions(raw);

    // Attach safety summary as a non-breaking extension
    // The route handler will extract this and handle it appropriately
    return {
      ...cleaned,
      __safetySummary: {
        ...safetySummary,
        // Mark if we used fallback
        hadFormatIssues: safetySummary.hadFormatIssues || usedFallback,
      },
    };
  }
}

