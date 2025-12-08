# Phase 4 - LLM Suggestion Engine - Complete ✅

## Summary

Phase 4 has been successfully completed. The backend now includes an AI suggestion pipeline that generates E/M codes, diagnoses, procedures, and risk assessments for encounters using a pluggable LLM abstraction layer.

## What Was Created

### 1. AI Suggestion Types (`backend/src/types/aiSuggestions.ts`)

✅ **Type Definitions:**
- `AiDiagnosisSuggestion` - { code, description, confidence, noteSnippets }
- `AiProcedureSuggestion` - { code, description, confidence, noteSnippets, withinCuratedSet }
- `EmAlternative` - { code, label, recommended }
- `ConfidenceBucket` - 'low' | 'medium' | 'high'
- `EncounterSuggestionsResult` - Complete result structure with all AI fields

### 2. LLM Abstraction Layer

✅ **LLMClient Interface** (`backend/src/llm/LLMClient.ts`):
- Defines `generateEncounterSuggestions()` method
- Pluggable interface for different LLM providers

✅ **MockLLMClient** (`backend/src/llm/MockLLMClient.ts`):
- Deterministic fake suggestions for testing
- Keyword-based logic:
  - "diabetes"/"metformin" → E11.9 diagnosis
  - "hypertension"/"bp" → I10 diagnosis
  - "B12" → J3420 procedure
  - Fixed E/M: 99213 with confidence 0.8
  - Returns mock risk assessment and hints

✅ **LLM Factory** (`backend/src/llm/index.ts`):
- `getLLMClient()` - Returns singleton LLM client instance
- Currently returns MockLLMClient
- Ready for future real provider integration

### 3. Suggestion Service (`backend/src/services/SuggestionService.ts`)

✅ **Core Function: `runSuggestionsForEncounter()`**

**Validation:**
- Checks encounter exists and belongs to practice
- Validates noteText is present and not empty
- Truncates noteText to MAX_NOTE_CHARS (10,000) if needed

**LLM Integration:**
- Calls `getLLMClient().generateEncounterSuggestions()`
- Handles LLM errors gracefully

**Data Mapping:**
- Maps LLM result to Prisma Encounter fields:
  - `aiEmSuggested`, `aiEmAlternativesJson`, `aiEmConfidence`
  - `aiDiagnosisSuggestionsJson`, `aiProcedureSuggestionsJson`
  - `aiConfidenceBucket` (computed from confidence)
  - `denialRiskLevel`, `denialRiskReasons`
  - `hadUndercodeHint`, `hadMissedServiceHint`
- Sets `status = ai_suggested`

**Audit Logging:**
- Creates `AI_SUGGESTED_CODES` audit event
- Includes AI suggestion metadata in payload

### 4. Suggest Route (`backend/src/routes/encounters.ts`)

✅ **POST /api/encounters/:id/suggest**

**Authentication:**
- Requires `requireAuth` middleware
- Uses `req.user` for practiceId, userId, role

**Error Handling:**
- `NOT_FOUND` → 404 "Encounter not found"
- `EMPTY_NOTE` → 400 "Encounter note is empty. Please add a note before running suggestions."
- `LLM_ERROR` → 502 "Unable to generate suggestions at this time. Please try again."
- Other errors → 500 "Unexpected error"

**Response:**
- Returns updated Encounter DTO with all AI fields:
  - `aiEmSuggested`, `aiEmAlternatives`, `aiEmConfidence`
  - `aiDiagnosisSuggestions`, `aiProcedureSuggestions`
  - `aiConfidenceBucket`, `denialRiskLevel`, `denialRiskReasons`
  - `hadUndercodeHint`, `hadMissedServiceHint`
  - Plus all standard encounter fields

### 5. DTO Updates

✅ **Enhanced `toEncounterDto()` helper:**
- Now includes AI suggestion fields in response
- Decodes AI JSON fields to arrays for frontend consumption

## API Endpoint

### Generate AI Suggestions

```
POST /api/encounters/:id/suggest
Headers: Authorization: Bearer <token>
Body: {} (no body required)
```

**Response:**
```json
{
  "id": "enc_123",
  "status": "ai_suggested",
  "aiEmSuggested": "99213",
  "aiEmAlternatives": [
    { "code": "99212", "label": "lower complexity", "recommended": false },
    { "code": "99213", "label": "recommended", "recommended": true }
  ],
  "aiEmConfidence": 0.8,
  "aiDiagnosisSuggestions": [
    {
      "code": "E11.9",
      "description": "Type 2 diabetes mellitus without complications",
      "confidence": 0.9,
      "noteSnippets": ["(mock) Mention of diabetes/metformin"]
    }
  ],
  "aiProcedureSuggestions": [
    {
      "code": "J3420",
      "description": "Injection, vitamin B12...",
      "confidence": 0.88,
      "noteSnippets": ["(mock) Mention of B12 injection"],
      "withinCuratedSet": true
    }
  ],
  "aiConfidenceBucket": "high",
  "denialRiskLevel": "low",
  "denialRiskReasons": ["(mock) No obvious denial risks detected"],
  "hadUndercodeHint": true,
  "hadMissedServiceHint": true,
  // ... other encounter fields
}
```

## Testing

### Manual Test Checklist

1. **Create an encounter:**
   ```bash
   curl -X POST http://localhost:4000/api/encounters \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "encounterDate": "2025-12-08",
       "patientPseudoId": "pt_001",
       "visitType": "office_established",
       "specialty": "primary_care",
       "noteText": "Patient with diabetes and hypertension. BP well controlled. B12 injection given."
     }'
   ```

2. **Generate suggestions:**
   ```bash
   curl -X POST http://localhost:4000/api/encounters/{encounterId}/suggest \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Verify results:**
   - Check response includes AI suggestion fields
   - Verify status changed to "ai_suggested"
   - Check database: Encounter row updated with AI fields
   - Check AuditEvent: AI_SUGGESTED_CODES event created

### Mock LLM Behavior

The MockLLMClient detects keywords in noteText:
- **"diabetes" or "metformin"** → Adds E11.9 diagnosis
- **"hypertension" or "bp"** → Adds I10 diagnosis  
- **"B12"** → Adds J3420 procedure
- Always suggests E/M code **99213** with confidence **0.8**
- Sets `hadUndercodeHint: true` and `hadMissedServiceHint: true` if procedures found

## Architecture

### LLM Abstraction

The system uses a pluggable LLM architecture:

```
SuggestionService
    ↓
getLLMClient()
    ↓
LLMClient Interface
    ↓
MockLLMClient (current)
    ↓
[Future: OpenAILLMClient, AnthropicLLMClient, etc.]
```

This allows:
- Easy testing with mock data
- Simple switching between providers
- No changes to routes/service when adding real LLM

### Data Flow

1. Route receives POST /api/encounters/:id/suggest
2. SuggestionService validates encounter and noteText
3. LLMClient generates suggestions from noteText
4. SuggestionService maps results to Encounter fields
5. Database updated with AI fields + status = ai_suggested
6. AuditEvent created (AI_SUGGESTED_CODES)
7. Updated Encounter DTO returned to client

## Next Steps

Phase 4 is complete! Ready for **Phase 5 - Provider UI** where we'll:
- Add "Run Codeloom" button to provider encounter detail page
- Display AI suggestions in UI
- Allow providers to accept/reject suggestions
- Send encounters to biller queue

## Files Created/Modified

### New Files
- `backend/src/types/aiSuggestions.ts` - AI suggestion type definitions
- `backend/src/llm/LLMClient.ts` - LLM interface
- `backend/src/llm/MockLLMClient.ts` - Mock LLM implementation
- `backend/src/llm/index.ts` - LLM factory
- `backend/src/services/SuggestionService.ts` - Suggestion orchestration

### Modified Files
- `backend/src/routes/encounters.ts` - Added POST /:id/suggest route, enhanced DTO helper

## Notes

- **Mock LLM Only**: Currently uses MockLLMClient for deterministic testing
- **No Real API Keys Required**: Can test end-to-end without LLM provider setup
- **Ready for Real LLM**: Architecture supports easy integration of OpenAI/Anthropic later
- **Note Truncation**: Notes > 10,000 chars are truncated (naive approach; can be improved later)
- **Error Handling**: Comprehensive error handling for all failure modes

**Phase 4 is complete and ready for testing!** 🚀

