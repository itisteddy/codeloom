import { EncounterSuggestionsResult } from '../types/aiSuggestions';

export interface LLMClient {
  generateEncounterSuggestions(input: {
    noteText: string;
    visitType: string;
    specialty: string;
  }): Promise<EncounterSuggestionsResult>;
}

