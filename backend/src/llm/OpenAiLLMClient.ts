import { LLMClient } from './LLMClient';
import { EncounterSuggestionsResult } from '../types/aiSuggestions';
import { config } from '../config';

export class OpenAiLLMClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.llm.openaiApiKey;
    this.model = config.llm.openaiModel;
  }

  async generateEncounterSuggestions(input: {
    noteText: string;
    visitType: string;
    specialty: string;
  }): Promise<EncounterSuggestionsResult> {
    const systemPrompt = `You are a conservative medical coding assistant for ${input.specialty} encounters. Your role is to suggest accurate E/M codes, diagnosis codes (ICD-10-CM), and procedure codes (CPT) based on clinical documentation.

CRITICAL RULES:
1. Never guess codes that are not clearly supported by the note.
2. Prefer undercoding over overcoding when uncertain.
3. If something is unclear, omit that code and mention it in denialRiskReasons.
4. Only suggest E/M codes (e.g., 99213, 99214, 99215) - do not suggest other CPT codes unless explicitly documented.
5. For procedures, only suggest codes that are clearly documented in the note.

Respond ONLY with strict JSON matching this exact schema:
{
  "emSuggested": "99213" | "99214" | "99215" | null,
  "emAlternatives": [
    {
      "code": "99213",
      "label": "lower complexity",
      "recommended": false
    }
  ],
  "emConfidence": 0.0-1.0,
  "diagnoses": [
    {
      "code": "E11.9",
      "description": "Type 2 diabetes mellitus without complications",
      "confidence": 0.0-1.0,
      "noteSnippets": ["brief snippet from note"]
    }
  ],
  "procedures": [
    {
      "code": "J3420",
      "description": "Injection, vitamin B12",
      "confidence": 0.0-1.0,
      "noteSnippets": ["brief snippet"],
      "withinCuratedSet": true
    }
  ],
  "confidenceBucket": "low" | "medium" | "high",
  "denialRiskLevel": "low" | "medium" | "high",
  "denialRiskReasons": ["reason 1", "reason 2"],
  "hadUndercodeHint": false,
  "hadMissedServiceHint": false
}

Example response:
{
  "emSuggested": "99214",
  "emAlternatives": [
    {"code": "99213", "label": "lower complexity", "recommended": false},
    {"code": "99214", "label": "recommended", "recommended": true}
  ],
  "emConfidence": 0.85,
  "diagnoses": [
    {"code": "E11.9", "description": "Type 2 diabetes", "confidence": 0.9, "noteSnippets": ["diabetes"]}
  ],
  "procedures": [],
  "confidenceBucket": "high",
  "denialRiskLevel": "low",
  "denialRiskReasons": [],
  "hadUndercodeHint": false,
  "hadMissedServiceHint": false
}`;

    const userPrompt = `Specialty: ${input.specialty}
Visit Type: ${input.visitType}
Note Text:
${input.noteText}

Provide coding suggestions in the exact JSON format specified.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Lower temperature for more consistent coding
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      // Parse JSON response
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        throw new Error('LLM_PARSE_ERROR');
      }

      // Map to EncounterSuggestionsResult with safe defaults
      const result: EncounterSuggestionsResult = {
        emSuggested: parsed.emSuggested || null,
        emAlternatives: Array.isArray(parsed.emAlternatives) ? parsed.emAlternatives : [],
        emConfidence: typeof parsed.emConfidence === 'number' ? parsed.emConfidence : null,
        diagnoses: Array.isArray(parsed.diagnoses) ? parsed.diagnoses : [],
        procedures: Array.isArray(parsed.procedures) ? parsed.procedures : [],
        confidenceBucket: ['low', 'medium', 'high'].includes(parsed.confidenceBucket)
          ? parsed.confidenceBucket
          : null,
        denialRiskLevel: ['low', 'medium', 'high'].includes(parsed.denialRiskLevel)
          ? parsed.denialRiskLevel
          : null,
        denialRiskReasons: Array.isArray(parsed.denialRiskReasons) ? parsed.denialRiskReasons : [],
        hadUndercodeHint: Boolean(parsed.hadUndercodeHint),
        hadMissedServiceHint: Boolean(parsed.hadMissedServiceHint),
      };

      return result;
    } catch (error: any) {
      if (error.message === 'LLM_PARSE_ERROR') {
        throw error;
      }
      // Wrap other errors
      const wrapped = new Error('LLM_ERROR');
      // @ts-expect-error attach cause
      wrapped.cause = error;
      throw wrapped;
    }
  }
}

