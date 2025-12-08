# PRD – Compliance-First Billing Coach (Codeloom)

## Project Overview

**Project Name:** Codeloom  
**Purpose:** A compliance-first billing coach application that helps healthcare providers and billers accurately code medical encounters using AI-powered suggestions while maintaining full audit trails and compliance readiness.

## High-Level Architecture (MVP)

### Frontend
- **SPA:** React (TypeScript)
- **Routing:** React Router
- **Styling:** TailwindCSS (or similar utility CSS)

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express / Fastify
- **Database:** PostgreSQL
- **Auth:** JWT + role-based access control
- **LLM:** Managed API (e.g., OpenAI/Anthropic) behind a service layer

### Key Services
- **AuthService** – users, roles, sessions
- **EncounterService** – encounters + note + codes
- **SuggestionService** – wraps LLM + rules
- **TrainingService** – training cases + attempts
- **ExportService** – CSV/JSON export
- **AuditService** – event logging

## Core Data Models

### User & Practice

```typescript
type UserRole = "provider" | "biller" | "admin";

interface Practice {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  // future: address, NPI, etc.
}

interface User {
  id: string;
  practiceId: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  // future: certification fields for billers
}
```

### Encounter & Codes

```typescript
type EncounterStatus = "draft" | "ai_suggested" | "finalized" | "exported";
type DenialRiskLevel = "low" | "medium" | "high";
type ConfidenceBucket = "low" | "medium" | "high";
type DecisionDelta = "accepted_as_is" | "lower_than_ai" | "higher_than_ai" | "different_code";

interface Encounter {
  id: string;
  practiceId: string;
  providerId: string;
  finalizedByUserId?: string;
  patientPseudoId: string; // non-PHI identifier
  encounterDate: string;   // ISO
  visitType: string;       // e.g. "office_established", "office_new", "telehealth"
  specialty: string;       // e.g. "primary_care"
  noteText: string;        // raw pasted note (encrypted at rest)
  status: EncounterStatus;
  
  // AI suggestion snapshot
  aiEmSuggested?: string;
  aiEmAlternatives?: { code: string; label: string; recommended: boolean }[];
  aiEmConfidence?: number; // 0–1
  aiDiagnosisSuggestions?: AiDiagnosisSuggestion[];
  aiProcedureSuggestions?: AiProcedureSuggestion[];
  aiConfidenceBucket?: ConfidenceBucket;
  
  // Final codes
  finalEmCode?: string;
  finalEmCodeSource?: "ai" | "provider" | "biller" | "mixed";
  finalDiagnosisCodes: FinalDiagnosisCode[];
  finalProcedureCodes: FinalProcedureCode[];
  
  // Risk & hints
  denialRiskLevel?: DenialRiskLevel;
  denialRiskReasons?: string[];
  hadUndercodeHint: boolean;
  hadMissedServiceHint: boolean;
  
  // Decision delta
  emDecisionDelta?: DecisionDelta;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
}

interface AiDiagnosisSuggestion {
  code: string;
  description: string;
  confidence: number;
  noteSnippets: string[]; // brief snippets
}

interface AiProcedureSuggestion {
  code: string;
  description: string;
  confidence: number;
  noteSnippets: string[];
  withinCuratedSet: boolean;
}

interface FinalDiagnosisCode {
  code: string;
  description: string;
  source: "ai" | "user";
}

interface FinalProcedureCode {
  code: string;
  description: string;
  modifiers: string[];
  source: "ai" | "user";
}
```

### Audit Events

```typescript
type AuditAction =
  | "AI_SUGGESTED_CODES"
  | "USER_CHANGED_EM_CODE"
  | "USER_ADDED_DIAGNOSIS"
  | "USER_REMOVED_DIAGNOSIS"
  | "USER_CHANGED_PROCEDURE"
  | "USER_FINALIZED_CODES"
  | "ENCOUNTER_CREATED"
  | "ENCOUNTER_UPDATED";

interface AuditEvent {
  id: string;
  practiceId: string;
  encounterId: string;
  userId: string;
  userRole: UserRole;
  action: AuditAction;
  payload: Record<string, any>; // old/new values, etc.
  createdAt: string;
}
```

### Training Cases & Attempts

```typescript
type TrainingDifficulty = "easy" | "medium" | "hard";

interface TrainingCase {
  id: string;
  title: string;
  specialty: string;         // e.g. "primary_care"
  difficulty: TrainingDifficulty;
  noteText: string;          // synthetic/de-identified
  correctEmCode: string;
  correctDiagnosisCodes: string[];
  correctProcedureCodes: string[];
  createdAt: string;
  updatedAt: string;
}

interface TrainingAttempt {
  id: string;
  userId: string;
  trainingCaseId: string;
  userEmCode: string;
  userDiagnosisCodes: string[];
  userProcedureCodes: string[];
  aiEmCode: string;
  aiDiagnosisCodes: string[];
  aiProcedureCodes: string[];
  scorePercent: number;
  matchSummary: {
    emMatch: boolean;
    diagnosisMatches: number;
    diagnosisTotal: number;
    procedureMatches: number;
    procedureTotal: number;
  };
  createdAt: string;
}
```

## REST API Surface (MVP)

All endpoints under `/api`. Auth via Bearer JWT.

### Auth
- `POST /api/auth/register` (for internal seeding / admin only in prod)
- `POST /api/auth/login`

### Practices
- `GET /api/practices/me` — current user's practice (role-based)

### Encounters
- `GET /api/encounters` — list with filters (status, date, provider)
- `POST /api/encounters` — create encounter
- `GET /api/encounters/:id` — detail
- `PATCH /api/encounters/:id` — update basics
- `PATCH /api/encounters/:id/codes` — set/edit final codes
- `POST /api/encounters/:id/suggest` — run billing coach
- `POST /api/encounters/:id/finalize` — finalize codes

### Exports
- `GET /api/exports/encounters` — export finalized encounters (CSV/JSON)

### Training API
- `GET /api/training/cases` — list training cases
- `GET /api/training/cases/:id` — get case detail
- `POST /api/training/cases/:id/attempts` — submit attempt

## Phase Map

1. **Phase 0** – Project Bootstrap & Hygiene
2. **Phase 1** – Domain Model & Data Layer
3. **Phase 2** – Auth, Roles & Practice Management
4. **Phase 3** – Encounter Flow Backend (Provider + Biller)
5. **Phase 4** – LLM Suggestion Engine ("Codeloom Brain")
6. **Phase 5** – Provider UI (Note → Suggestion → Handoff)
7. **Phase 6** – Biller UI (Queue → Review → Finalize)
8. **Phase 7** – Training / Education SKU
9. **Phase 8** – Exports, Analytics & Metrics
10. **Phase 9** – Security, Audit Trail & Compliance Readiness
11. **Phase 10** – Pilot Readiness, Environments & Observability
12. **Phase 11** – Post-MVP Enhancements (Future)

## SuggestionService / LLM Pipeline

### High-level pipeline
1. Input validation & trimming (10k char limit, prefer A/P)
2. Preprocessing (identify sections with regex heuristics)
3. LLM call #1 (E/M + diagnoses)
4. LLM call #2 (procedures + modifiers + denial risk)
5. Rule layer (validate codes, clamp confidence, map to buckets)
6. Persist (write AI fields, emit audit event)

### Timeouts & Retry
- Each LLM call has a timeout (10–15s)
- If LLM fails: return 503 with error message
- No partial/wrong suggestions

## Frontend Routes & Components

### Routes
- `/login` – auth
- `/encounters` – list (D1/B1)
- `/encounters/:id` – detail (doctor or biller view)
- `/training` – training list (T1)
- `/training/:id` – training case (T2)
- `/settings` – practice & user settings
- `/exports` – simple export UI (optional)

### Key Components
- `EncountersListPage` – fetch and display encounters with filters
- `EncounterDetailPage` – provider/biller views with note, codes, suggestions
- `TrainingListPage` – list of training cases
- `TrainingCasePage` – case detail with attempt submission

## Metrics & Baseline Instrumentation

Backend events to log:
- `encounter_suggest_requested` (encounterId, userId, latency_ms, note_length_chars)
- `encounter_suggest_succeeded` / `failed`
- `encounter_codes_finalized` (delta vs AI, emDecisionDelta, hadUndercodeHint, etc.)
- `training_attempt_submitted` (scorePercent, emMatch, etc.)

Pilot practices should provide:
- 3–6 months of baseline denial rate and revenue per visit
- Use export IDs + date ranges to cross-reference later

