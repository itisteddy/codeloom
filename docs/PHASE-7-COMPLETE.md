# Phase 7 - Training/Education SKU - Complete ✅

## Summary

Phase 7 has been successfully completed. The application now includes a complete training mode where users can practice coding on synthetic cases, receive immediate feedback with scores, and compare their answers against ground truth.

## What Was Created

### 1. Backend: Training Service

✅ **TrainingService** (`backend/src/services/trainingService.ts`):

**Functions:**
- `listTrainingCases()` - List cases with optional filters (specialty, difficulty)
- `getTrainingCaseById()` - Get case detail (without correct codes)
- `submitTrainingAttempt()` - Submit attempt and compute score
- `listUserAttempts()` - Get user's attempt history (optional)

**Scoring Logic:**
- **E/M Scoring:**
  - Exact match: 100% of E/M weight (50%)
  - Near match (same prefix, difference ≤1): 70% of E/M weight
  - Incorrect: 0% of E/M weight

- **Diagnosis Scoring:**
  - Calculates intersection of user codes vs correct codes
  - Tracks missing and extra codes
  - Score = (correct hits / total correct) × 30%

- **Procedure Scoring:**
  - Same logic as diagnoses
  - Score = (correct hits / total correct) × 20%

- **Final Score:**
  - Weighted sum: E/M (50%) + Diagnoses (30%) + Procedures (20%)
  - Rounded to 0-100%

**Code Normalization:**
- All codes normalized (trim + uppercase) for comparison
- E/M near-match detection based on prefix and numeric difference

### 2. Backend: Training Routes

✅ **Training Routes** (`backend/src/routes/training.ts`):

- `GET /api/training/cases` - List training cases
  - Query params: `specialty`, `difficulty`
  - Returns summary DTOs

- `GET /api/training/cases/:id` - Get case detail
  - Returns case with noteText (no correct codes)

- `POST /api/training/cases/:id/attempt` - Submit attempt
  - Validates input (userEmCode, arrays)
  - Calls scoring service
  - Creates TrainingAttempt record
  - Returns detailed result with score and match summary

✅ **App Integration:**
- Mounted `/api/training` routes in `app.ts`

### 3. Frontend: Training API Client

✅ **Training API** (`frontend/src/api/training.ts`):
- Types: `TrainingCaseSummary`, `TrainingCaseDetail`, `TrainingAttemptResult`
- Functions:
  - `listTrainingCases()` - List with filters
  - `getTrainingCase()` - Get case detail
  - `submitTrainingAttempt()` - Submit and get results

### 4. Frontend: Training Pages

✅ **TrainingDashboardPage** (`frontend/src/pages/TrainingDashboardPage.tsx`):
- Lists all training cases
- Filters:
  - Specialty dropdown (All, Primary Care)
  - Difficulty dropdown (All, Easy, Medium, Hard)
- Table with columns: Title, Specialty, Difficulty, Created, Action
- "Open" button navigates to case detail

✅ **TrainingCasePage** (`frontend/src/pages/TrainingCasePage.tsx`):
- Two-column layout:
  - Left: Case info and note (read-only)
  - Right: Coding form and results

**Coding Form:**
- E/M code input
- Diagnosis codes textarea (comma/newline separated)
- Procedure codes textarea (comma/newline separated)
- "Submit Attempt" button

**Results Display:**
- Large score percentage
- E/M comparison:
  - Shows correct vs user answer
  - Indicates exact/near/incorrect match
- Diagnoses comparison:
  - Shows correct codes
  - Shows user codes
  - Displays correct count
  - Lists missing and extra codes
- Procedures comparison:
  - Same format as diagnoses

### 5. Navigation Updates

✅ **RootLayout:**
- Added "Training" nav link alongside "Encounters"

✅ **App.tsx:**
- Added routes:
  - `/training` → TrainingDashboardPage
  - `/training/cases/:id` → TrainingCasePage

## User Flow

### Training Workflow

1. **Navigate to Training:**
   - Click "Training" in header
   - See list of training cases

2. **Filter Cases:**
   - Select specialty and/or difficulty
   - View filtered results

3. **Open Case:**
   - Click "Open" on a case
   - Read case note and metadata

4. **Enter Codes:**
   - Enter E/M code (e.g., "99213")
   - Enter diagnosis codes (e.g., "E11.9, I10")
   - Enter procedure codes (e.g., "J3420")

5. **Submit:**
   - Click "Submit Attempt"
   - See immediate results:
     - Score percentage
     - E/M comparison (exact/near/incorrect)
     - Diagnosis comparison (correct/missing/extra)
     - Procedure comparison (correct/missing/extra)

## Scoring Details

### E/M Scoring
- **Exact Match:** User code exactly matches correct code → 50% of total score
- **Near Match:** Same prefix (e.g., 9921x), difference ≤1 → 35% of total score
- **Incorrect:** No match → 0% of E/M portion

### Diagnosis Scoring
- **Formula:** (correct hits / total correct) × 30%
- **Example:** 2 correct, user got 1 → 15% of total score
- **Missing codes:** Listed in feedback
- **Extra codes:** Listed in feedback

### Procedure Scoring
- **Formula:** (correct hits / total correct) × 20%
- **Same logic as diagnoses**

### Example Score Calculation
- E/M: Exact match → 50% × 1.0 = 50%
- Diagnoses: 1/2 correct → 30% × 0.5 = 15%
- Procedures: 0/1 correct → 20% × 0.0 = 0%
- **Total: 65%**

## Testing Checklist

### Manual Test Flow

1. **Login:**
   - Login with `provider@example.com` / `changeme123`

2. **Navigate to Training:**
   - Click "Training" in header
   - Should see list of training cases from seed

3. **Filter Cases:**
   - Select "Medium" difficulty
   - Verify list filters

4. **Open Case:**
   - Click "Open" on a case
   - Verify case note displays

5. **Submit Attempt:**
   - Enter E/M: "99213"
   - Enter diagnoses: "E11.9, I10"
   - Enter procedures: "J3420"
   - Click "Submit Attempt"
   - Verify results appear:
     - Score percentage
     - E/M comparison
     - Diagnosis comparison
     - Procedure comparison

6. **Verify Scoring:**
   - Check if score matches expected calculation
   - Verify missing/extra codes are listed correctly

## API Endpoints

### List Training Cases
```
GET /api/training/cases?specialty=primary_care&difficulty=medium
Headers: Authorization: Bearer <token>
```

### Get Case Detail
```
GET /api/training/cases/:id
Headers: Authorization: Bearer <token>
```

### Submit Attempt
```
POST /api/training/cases/:id/attempt
Headers: Authorization: Bearer <token>
Body: {
  "userEmCode": "99213",
  "userDiagnosisCodes": ["E11.9", "I10"],
  "userProcedureCodes": ["J3420"]
}
```

**Response:**
```json
{
  "attemptId": "attempt_123",
  "caseId": "case_123",
  "userEmCode": "99213",
  "userDiagnosisCodes": ["E11.9", "I10"],
  "userProcedureCodes": ["J3420"],
  "correctEmCode": "99214",
  "correctDiagnosisCodes": ["E11.9", "I10"],
  "correctProcedureCodes": [],
  "scorePercent": 85,
  "matchSummary": {
    "em": { "isExact": false, "isNear": true },
    "diagnoses": {
      "correctCount": 2,
      "totalCorrect": 2,
      "extraCount": 0,
      "missingCodes": [],
      "extraCodes": []
    },
    "procedures": {
      "correctCount": 0,
      "totalCorrect": 0,
      "extraCount": 1,
      "missingCodes": [],
      "extraCodes": ["J3420"]
    }
  },
  "createdAt": "2025-12-08T00:00:00.000Z"
}
```

## Features

### Scoring System
- **Transparent:** Clear breakdown of E/M, diagnoses, procedures
- **Weighted:** E/M (50%), Diagnoses (30%), Procedures (20%)
- **Near-match detection:** Recognizes close E/M codes
- **Detailed feedback:** Shows missing and extra codes

### User Experience
- **Immediate feedback:** Results shown instantly after submission
- **Clear comparison:** Side-by-side correct vs user answers
- **Visual indicators:** Color-coded difficulty badges
- **Code parsing:** Flexible input (comma or newline separated)

### Data Persistence
- **Attempts stored:** All attempts saved to database
- **Match summary:** Detailed comparison stored as JSON
- **History ready:** Foundation for attempt history view

## Next Steps

Phase 7 is complete! The training mode is fully functional. Future enhancements could include:
- **LLM Comparison:** Show AI suggestions alongside user answers
- **Attempt History:** View past attempts for each case
- **Leaderboards:** Compare scores with other users
- **More Cases:** Expand training case library

## Files Created/Modified

### New Files
- `backend/src/services/trainingService.ts` - Scoring logic and service functions
- `backend/src/routes/training.ts` - Training API routes
- `frontend/src/api/training.ts` - Training API client
- `frontend/src/pages/TrainingDashboardPage.tsx` - Training cases list
- `frontend/src/pages/TrainingCasePage.tsx` - Case detail and attempt submission

### Modified Files
- `backend/src/app.ts` - Added training routes
- `frontend/src/App.tsx` - Added training routes
- `frontend/src/routes/RootLayout.tsx` - Added Training nav link

## Notes

- **AI Integration:** Currently AI fields are null; can be integrated later
- **Scoring Weights:** Configurable in service (currently 50/30/20)
- **Code Normalization:** Handles case-insensitive comparison
- **E/M Near Match:** Detects codes like 99213 vs 99214 (same prefix, diff ≤1)
- **Empty Cases:** Handles cases with no correct diagnoses/procedures

**Phase 7 is complete and ready for testing!** 🚀

