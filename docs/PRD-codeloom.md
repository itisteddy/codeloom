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


PRD Addendum
## Information below was added to enhance the architecture

1. What needs to change (from what I see in the screenshots)
Still-dev / mock things to remove or gate

Login page

Text: Use the seeded test account (provider@example.com / changeme123).
→ Must be removed or only shown when APP_ENV=dev.

Encounter > Denial Risk & Hints

Text: (mock) No obvious denial risks detected.
→ The (mock) qualifier must be removed for any pilot/prod use.

Shell / environment labels

Chip Dev next to “Sample Family Practice” and vdev in the sidebar.
→ Fine for you while developing; should be hidden entirely for pilot/prod.

E/M behavior vs what we want

The E/M card shows:

A recommended code (99213 (80% confidence)).

An alternate “lower complexity” chip (99212 – lower complexity).

The Denial panel is already saying “Undercoding hint detected – Documentation may support a higher level code”.

But:

There is no explicit “Highest supported” line in the E/M card.

That means the user sees the warning but doesn’t see, in a first-class way, which higher code is on the table.

We want:

Large Recommended code.

When applicable: a small, clear “Highest supported: 99xxx (yy% confidence)” line immediately under it.

Multi-diagnosis / multi-procedure UI

On your current encounter:

“DIAGNOSIS SUGGESTIONS: No diagnosis suggestions.”

“PROCEDURE SUGGESTIONS: No procedure suggestions.”

That’s fine for this specific case, but:

There’s no visible “Final Codes” card where the biller can manage multiple Dx/procedure codes.

There’s no visual proof that we handle multi-codes even though the backend supports it.

We want:

In the Suggestions panel: stacked rows for multiple diagnosis/procedure suggestions.

In the biller view: a Final Codes card with:

A list of diagnoses (multi-row) and procedures (multi-row).

Add/remove/edit controls.

Consistency / polish issues

Environment labels (Dev, vdev) are visible in a place a practice user would see.

Feedback section doesn’t show any “Thank you” state (from screenshot).

No visible Admin / Settings area for:

Billing & plan management.

Team / user management.

2. How to fix all of this (implementation outline)

I’ll give you a conceptual plan plus a Cursor-friendly summary.

2.1 Environment gating for dev vs pilot/prod

Backend

Add an APP_ENV variable (if you haven’t already):

APP_ENV=dev | pilot | prod


In the LLM config, enforce:

const appEnv = process.env.APP_ENV ?? 'dev';

if (['pilot', 'prod'].includes(appEnv) && process.env.LLM_MODE === 'mock') {
  throw new Error('LLM_MODE=mock is not allowed in pilot/prod');
}


Frontend

Surface the env:

export const APP_ENV = import.meta.env.VITE_APP_ENV ?? 'dev';
export const IS_DEV   = APP_ENV === 'dev';
export const IS_PILOT = APP_ENV === 'pilot';
export const IS_PROD  = APP_ENV === 'prod';


Use that to control:

Login page:

In JSX, wrap the seeded-account copy:

{IS_DEV && (
  <p className="mt-1 text-xs text-slate-500">
    Use the seeded test account (provider@example.com / changeme123).
  </p>
)}


Shell:

Only show Dev chip and vdev label when IS_DEV is true.

In pilot/prod, show only the practice name; optionally “Pilot” if you want to signal that.

Denial hints:

Remove (mock) unconditionally.

Final text:

"No obvious denial risks detected based on the current documentation."

2.2 Recommended + highest-supported E/M code

Backend (you likely already have most of this from earlier phases; this just wires it fully):

Ensure the Encounter model stores both:

model Encounter {
  // ...
  aiEmCode                       String?
  aiEmConfidence                 Float?
  aiEmHighestSupportedCode       String?
  aiEmHighestSupportedConfidence Float?
}


In your suggestion aggregation service:

interface EmCandidate {
  code: string;
  level: number;      // e.g. 2, 3, 4 etc.
  confidence: number; // 0–1
}

function selectEmCodes(result: EncounterSuggestionsResult) {
  const candidates: EmCandidate[] = [];
  if (result.emSuggested) candidates.push(result.emSuggested);
  if (result.emAlternatives?.length) candidates.push(...result.emAlternatives);

  const supported = candidates.filter(c => c.confidence >= 0.6);

  if (!supported.length) {
    return {
      recommended: result.emSuggested || null,
      highestSupported: null,
    };
  }

  const recommended =
    result.emSuggested ??
    supported.reduce((best, c) => (c.confidence > best.confidence ? c : best), supported[0]);

  const highestSupported = supported.reduce((best, c) =>
    c.level > best.level ? c : best,
  supported[0]);

  return { recommended, highestSupported };
}


Persist both values and expose in the DTO:

const { recommended, highestSupported } = selectEmCodes(raw);

await prisma.encounter.update({
  where: { id: encounterId },
  data: {
    aiEmCode: recommended?.code ?? null,
    aiEmConfidence: recommended?.confidence ?? null,
    aiEmHighestSupportedCode: highestSupported?.code ?? null,
    aiEmHighestSupportedConfidence: highestSupported?.confidence ?? null,
    // ...
  },
});


Under-coding hint uses these values:

if (recommended && highestSupported && highestSupported.level > recommended.level) {
  hints.push({
    type: 'UNDERCODING',
    severity: 'low',
    message: `Documentation may support ${highestSupported.code} (higher level) as well as ${recommended.code}. Review before finalizing.`,
  });
}


DTO for frontend:

emRecommended: encounter.aiEmCode
  ? { code: encounter.aiEmCode, confidence: encounter.aiEmConfidence ?? 0 }
  : null,
emHighestSupported: encounter.aiEmHighestSupportedCode
  ? {
      code: encounter.aiEmHighestSupportedCode,
      confidence: encounter.aiEmHighestSupportedConfidence ?? 0,
    }
  : null,


Frontend

Extend types:

interface EmDisplay {
  code: string;
  confidence: number;
}

interface EncounterAiSummary {
  emRecommended: EmDisplay | null;
  emHighestSupported: EmDisplay | null;
  // ...
}


In the Codeloom Suggestions E/M section, render like this:

<section className="space-y-3">
  <div>
    <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
      E/M Code
    </p>

    {emRecommended ? (
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-slate-900">
          {emRecommended.code}
        </p>
        <span className="text-xs text-slate-500">
          {Math.round(emRecommended.confidence * 100)}% confidence
        </span>
      </div>
    ) : (
      <p className="text-sm text-slate-500">
        No E/M recommendation available.
      </p>
    )}
  </div>

  {emHighestSupported &&
    emRecommended &&
    emHighestSupported.code !== emRecommended.code && (
      <div className="flex items-center gap-2 text-xs">
        <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-700">
          Highest supported
        </span>
        <span className="font-medium text-slate-800">
          {emHighestSupported.code}
        </span>
        <span className="text-slate-500">
          {Math.round(emHighestSupported.confidence * 100)}% confidence
        </span>
      </div>
    )}
</section>


That gives you:

Big recommended code.

A clean, compact “Highest supported” line when relevant.

Denial panel’s under-coding hint now clearly relates to something visible.

2.3 Multi-diagnosis & multi-procedure UI

Assuming backend stores arrays (EncounterDiagnosis / EncounterProcedure or JSON), the fix is all frontend.

Suggestions panel

Instead of just “No diagnosis suggestions”, list suggestions in stacked rows:

<section className="space-y-2">
  <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
    Diagnosis suggestions
  </p>
  {diagnoses.length === 0 ? (
    <p className="text-sm text-slate-500">No diagnosis suggestions.</p>
  ) : (
    <ul className="space-y-1">
      {diagnoses.map(dx => (
        <li
          key={dx.code}
          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium text-slate-900">{dx.code}</p>
            {dx.description && (
              <p className="text-xs text-slate-500">{dx.description}</p>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {Math.round(dx.confidence * 100)}%
          </span>
        </li>
      ))}
    </ul>
  )}
</section>


Same pattern for procedures.

Final Codes card (biller/admin view)

Add a card lower on the encounter page:

<Card>
  <CardHeader>
    <CardTitle>Final Codes</CardTitle>
    <CardDescription>
      These are the codes that will be submitted for this encounter.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Diagnoses */}
    <section>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
          Diagnoses
        </p>
        <Button size="xs" variant="outline" onClick={onAddDiagnosis}>
          Add diagnosis
        </Button>
      </div>
      {finalDiagnoses.length === 0 ? (
        <p className="text-sm text-slate-500">No diagnoses added yet.</p>
      ) : (
        <div className="space-y-1">
          {finalDiagnoses.map((dx, idx) => (
            <div
              key={`${dx.code}-${idx}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{dx.code}</p>
                {dx.description && (
                  <p className="text-xs text-slate-500">{dx.description}</p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove diagnosis"
                onClick={() => removeDiagnosis(idx)}
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>

    {/* Procedures – same pattern */}
  </CardContent>
</Card>


Wire onAddDiagnosis, removeDiagnosis, etc. to the existing update endpoint (PATCH /encounters/:id/final-codes or equivalent).

3. Billing, plan options & admin user management

You also asked:

“Also, what about billing, billing options and admin managements of users? How do I access that?”

Based on what we designed earlier:

The backend already tracks:

Practice plan / tier (e.g., plan: "free" | "standard" | "education" on Practice).

Usage (encounters run, suggestions, training attempts) for enforcement.

What’s missing in the UI right now is a practice admin area.

3.1 What we should have from a product POV

For a small practice MVP, an Admin section should give practice owners:

Billing & Plan

Current plan name and limits (encounters/month, users, features).

Usage this period (e.g., “42 / 100 AI encounters this month”).

A clear “Contact us to upgrade” or “Manage billing” button (for now this can just link to an email or placeholder page until Stripe is wired).

Team / User Management

List of users in the practice:

Name, email, role (Provider / Biller / Admin).

Ability to:

Invite a new user (send email with invite link).

Change roles (with guardrails; you might restrict who can grant admin).

Deactivate a user.

Settings (lightweight)

Specialty defaults.

Basic Codeloom toggles per practice (e.g., “Enable Training mode”, “Allow providers to see E/M suggestions”).

3.2 How to access it

Implementation-wise:

Add a new route group under something like /admin:

/admin/billing

/admin/team

Add an “Admin” entry in the left nav only if the user’s practice role is ADMIN:

const navItems = [
  { label: 'Encounters', href: '/encounters' },
  { label: 'Training', href: '/training' },
];

if (currentUser.role === 'ADMIN') {
  navItems.push({ label: 'Admin', href: '/admin/billing' });
}


or, alternatively, a top-right user menu item:

Click avatar → menu → Admin → goes to /admin/billing.

For now, simplest is sidebar “Admin” visible only for admins.

3.3 Minimal UI for Billing & Admin

Billing page

Card: “Plan & Billing”

Show:

Plan: Starter, Education, etc.

“Includes up to 100 AI encounters / month, 5 users” text.

Usage bar: e.g., “42 / 100 AI encounters used this month”.

Button:

For MVP: Contact sales to upgrade → opens mailto:... or a simple contact form.

Later: hook into Stripe customer portal.

Team page

Table: Name, Email, Role, Status, Actions.

Actions:

“Change role” dropdown (if you’re an admin).

“Deactivate” button.

“Invite user” button:

Opens modal: email + role.

Calls /admin/users/invite.

“Codeloom turns messy encounter notes into compliant, revenue-optimized codes—without changing your EMR or taking control away from your biller.” this tone sounds negative towards the biller "taking control away". Is should be positive. Optimize the tone across the application

There are  some non functional buttons like user profile button.


Understand the limitation of biller training and some of the common human errors that billers tend to make or obstacles that they find hard to get around to the system can be optimized for billers and make their life easier. Convenienve and accuracry. The system also has to be hipa compliant so we have to find ways to give control and confidence to the establishment. 

Along with this webapp I would like us to build a browser extention as an accompanying application especially for folks who dont want to leave their emr page. open question is do hospital and clinic applications use web browsers or they us actual installed desktop applications?

But we should also allow the upload of documents to increase convenience.

Create a landing page that has the proper marketing and branding terminology to sell this properly.


4. Personas & Roles

Codeloom serves small outpatient practices (1–10 providers). The product must reflect the real-world division of labor between clinical staff, billers, and owners.

4.1 External Personas (Customers)
4.1.1 Provider (MD / NP / PA)

Job to be done

“I want to document care the way I normally do and have Codeloom surface compliant, revenue-optimized codes without turning me into a coder.”

Key responsibilities

Document encounter notes (free text, often semi-structured).

Optionally run Codeloom on a note and review suggestions.

Optionally finalize codes when practice workflow allows providers to do so.

In-app needs

Simple encounter form:

Patient ID, date, visit type, specialty, note text.

“Run Codeloom” button with fast, trustworthy suggestions.

Clear E/M suggestion with:

Recommended code.

Highest supported code (when documentation supports a higher level).

Under-coding / denial hints.

Lightweight training mode to improve coding literacy (optional but high value).

Providers do not need:

Practice-level analytics.

Team management.

Billing or plan management.

4.1.2 Biller / Coder

Job to be done

“I want to turn a stack of notes into correct, revenue-maximizing claims quickly, without creating denial risk.”

Key responsibilities

Review notes and AI suggestions.

Choose and finalize E/M, diagnosis, and procedure codes.

Ensure documentation supports billed codes.

Maintain audit-friendly records of changes.

In-app needs

Encounter “queue” view:

Filters: status (needs coding / AI suggested / finalized), provider, date range.

Encounter detail view with:

Note text.

Codeloom Suggestions: E/M recommended vs highest supported, multiple Dx and CPT suggestions.

Denial risk & undercoding hints.

Final Codes editor:

Multiple diagnoses (ICD-10).

Multiple procedures (CPT/HCPCS).

Mark which codes were AI-suggested vs user-added.

Audit trail:

Who changed which code, from what → to what, and when.

Training mode focused on coding scenarios.

Billers do not need:

SaaS subscription management.

Practice-level configuration (PHI retention, plan, etc.).

4.1.3 Practice Admin / Owner

Job to be done

“If we pay for Codeloom, I want proof that it saves time, captures revenue safely, and plays nice with our compliance posture. I also need control over who can do what.”

Key responsibilities

Decide whether to adopt / renew Codeloom.

Control which staff have access and in what roles.

Manage billing and contractual relationship with Codeloom.

Set PHI and security preferences.

In-app needs

Practice-level Analytics:

Encounters per period.

AI usage rate.

Override rates (how often AI suggestions are changed).

E/M level distribution (spot systematic under-coding).

Time-to-finalize claims.

Admin / Settings:

Billing & Plan:

Current plan, limits, renewal date, usage vs limits.

Contact/upgrade path (for MVP, “Contact sales”).

Team:

Invite/remove users.

Assign roles: Provider / Biller / Practice Admin.

Security & Data:

PHI retention settings.

“Store PHI at rest” toggle (minimal PHI mode).

Integration status (later: EMR, browser extension).

Practice Admins do not finalize codes day-to-day; they review metrics and control configuration.

4.2 Internal Persona (Codeloom HQ)
4.2.1 Platform Admin / Ops

Job to be done

“Operate Codeloom as a SaaS product across many practices: onboard new tenants, support them, and monitor system health.”

Key responsibilities

Create organizations/practices and their initial admin users.

View cross-tenant usage and health (for support and forecasting).

Troubleshoot tenant issues (view configuration, impersonate in read-only mode).

Manage commercial terms and plan assignments.

Tooling needs (internal console, not MVP customer app)

Tenant list with status, plan, usage.

Ability to:

Create a new org/practice and initial Practice Admin user.

Temporarily impersonate a practice admin (read-only).

High-level metrics (encounters, active tenants, MRR/plan mix).

This console is out of scope for the first customer-facing MVP, but the data model and roles should leave room for it.

5. Account & Tenant Model

Codeloom is a multi-tenant SaaS product, where each subscribing practice has its own data silo.

5.1 Entities

Organization (Org / CustomerAccount)

Represents the legal customer (e.g. “Sample Family Practice, PLLC”).

Fields (non-exhaustive): id, name, billingContactName, billingContactEmail, billingAddress.

Practice

Represents a clinical site / billing unit.

For MVP, 1:1 with Organization (one practice per org).

Fields: id, orgId, name, specialty, timeZone, phiSettingsId, subscriptionId, createdAt.

User

Individual login account.

Belongs to exactly one Practice in MVP.

Fields: id, orgId, practiceId, email, name, hashedPassword, role, status.

Role ∈:

PROVIDER

BILLER

PRACTICE_ADMIN

PLATFORM_ADMIN (internal; cross-tenant access).

Subscription / Plan

Captures commercial relationship.

Fields: id, orgId (or practiceId), planType, billingCycle, status, renewalDate, externalBillingId (Stripe customer/sub), includedLimits JSON (e.g. encountersPerMonth, seats).

Usage

Tracks how the practice consumes Codeloom.

Scoped by practice and billing period.

Fields: id, practiceId, periodStart, periodEnd, encountersWithAiSuggestions, encountersFinalized, trainingAttempts, activeProviders.

5.2 User Lifecycle

Initial creation (first practice admin)

Platform Admin (Codeloom Ops) creates:

Org

Practice

Initial PRACTICE_ADMIN user.

A welcome email is sent with a one-time magic link or temporary password.

Inviting additional users

Practice Admin uses Admin → Team:

Enters email, role (Provider or Biller; optionally additional Admins), and optional metadata (specialty).

System creates an “invited” user record tied to the same org/practice and sends an invite email.

Invited user accepts:

Sets password.

Confirms name and optional preferences (time zone, specialty).

After activation, they can log in via the normal login form.

Deactivation

Practice Admin can set a user status to inactive (soft delete).

Inactive users:

Cannot log in.

Are retained for audit trails (events still linked to that user id).

Role changes

Practice Admin can promote/demote between Provider/Biller/Admin within their practice.

Only Platform Admin can grant or remove PLATFORM_ADMIN.

6. Permissions & Navigation (per persona)

The navigation and feature availability must be strictly role-based.

6.1 Provider

Nav items

Encounters

Training

Settings (personal)

Allowed actions

Create/edit encounters (for their own work).

Run Codeloom on their encounter.

View suggestions & denial hints.

[Configurable] Finalize codes (if practice policy allows).

Use Training mode.

Forbidden

Practice Analytics.

Team management.

Billing & Plan.

PHI/security settings.

6.2 Biller

Nav items

Encounters (queue)

Training (coding practice)

Settings (personal)

Allowed actions

View all encounters in the practice (subject to policy).

Run Codeloom and see suggestions.

Edit E/M, diagnosis, and procedure codes.

Finalize codes.

Add coded notes/comments for audit.

Use Training.

Forbidden

Practice Analytics.

Team management.

Billing & Plan.

PHI/security settings.

6.3 Practice Admin

Nav items

Encounters

Training

Analytics

Admin

Settings (personal)

Allowed actions

Everything a Provider or Biller can do (optionally limited in UI).

View practice-level Analytics:

Encounters volume.

AI usage.

Override rates.

Time-to-finalize.

E/M distribution.

Manage Admin → Team:

Invite users, assign roles, deactivate users.

Manage Admin → Billing & Plan:

View current plan and limits.

View current usage against limits.

See renewal date.

Initiate contact/upgrade (MVP: mailto link / contact form).

Manage Admin → Security & Data:

Configure PHI retention days.

Toggle “store PHI at rest”.

View summary of security posture.

6.4 Platform Admin

Not exposed in customer-facing app navigation.

Role allows access to internal console (future) and service operations.

7. Billing Model & Plan Behavior
7.1 Pricing Strategy (MVP)

Codeloom uses per-practice subscription plans with soft usage limits:

Plan A – Starter

Target: 1–2 providers, 1 biller.

Included:

Up to N providers and M billers.

Up to X encounters per month (where Codeloom is run).

Training mode for all users.

Support: email.

Plan B – Growth

Target: 3–5 providers, up to 3 billers.

Higher encounter limit (Y > X).

Includes:

Training mode.

Practice Analytics.

Priority support.

Plan C – Enterprise (future)

Custom encounter and seat limits.

Discounts for annual commitment.

EMR integration and custom security / BAA terms.

Exact numbers (X, Y, prices) are to be specified in GTM docs, not the PRD.

7.2 Usage Enforcement (MVP)

Codeloom tracks usage via the Usage entity.

When a practice approaches its monthly encounter limit (e.g. 80%):

Practice Admin sees an in-app banner on Analytics/Admin pages.

Optional email alert to billing contact.

When the limit is exceeded:

Soft cap:

Codeloom continues to function.

UI shows “You’ve exceeded your included encounters. Contact us to upgrade.”

Hard caps and automatic billing upgrades are deferred to a later version.

7.3 Billing Controls for Practice Admin

Within Admin → Billing & Plan, Practice Admin can:

View current plan, limits, and usage.

View renewal date and status (active / trial / grace).

See the billing contact email and org name.

For MVP, they cannot self-change plan; they instead click:

“Contact sales to change plan” (email link) or

“Schedule a call” (links to scheduling page).

Self-serve upgrades/downgrades and integrated payments (Stripe, etc.) are planned but out of scope for the first pilot.

8. Settings (Per-User vs Practice-Level)
8.1 Per-User Settings (Profile)

Every user has a Settings / Profile area (avatar menu), independent of their role:

Name, avatar.

View email (change via support or verified flow in a later version).

Change password.

Time zone and date format.

Theme (light/dark).

Notification preferences:

Email alerts for assignments or summaries.

Frequency (immediate / daily / off).

Additional persona-specific preferences:

Provider

Default specialty.

Default visit type.

Toggle: “Run Codeloom automatically after saving note.”

Training preferences (desired difficulty, topics).

Biller

Default encounter queue filters.

Default visible columns in Encounter list.

Toggle: “Auto-open Suggestion panel when opening encounter.”

Practice Admin

Default Analytics date range.

Email summaries:

Weekly “Codeloom impact” report (when implemented).

Alerts about usage thresholds.

Per-user settings are stored in a user-scoped preferences object and do not affect other users.

8.2 Practice-Level Settings (Admin)

Accessible only to PRACTICE_ADMIN (and PLATFORM_ADMIN via internal tools):

Team

Manage users, roles, invites, deactivation.

Billing & Plan

View plan, limits, and usage.

View renewal date.

Contact/upgrade entry points.

Security & Data

PHI retention settings.

“Store PHI at rest” toggle.

Documentation about how Codeloom handles PHI.

Integrations (future)

EMR connections.

Browser extension configuration or install instructions.
