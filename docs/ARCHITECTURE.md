# Codeloom Architecture

## Overview

Codeloom is a compliance-first billing coach application built with a modern, scalable architecture designed for healthcare compliance and audit readiness.

## Technology Stack

### Frontend
- **Framework:** React 18+ with TypeScript
- **Routing:** React Router v6
- **Styling:** TailwindCSS
- **State Management:** React Query (TanStack Query) for server state
- **Build Tool:** Vite
- **Package Manager:** pnpm

### Backend
- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js (or Fastify)
- **Database:** PostgreSQL
- **ORM/Migrations:** Prisma (or Drizzle)
- **Authentication:** JWT with refresh tokens
- **Validation:** Zod
- **Logging:** Winston or Pino

### Infrastructure
- **Database Hosting:** TBD (Supabase, AWS RDS, or similar)
- **LLM Provider:** OpenAI/Anthropic (configurable)
- **Deployment:** TBD (Render, Railway, AWS, etc.)

## Project Structure

```
codeloom/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── db/              # Database client & migrations
│   │   ├── models/          # TypeScript models/ORM entities
│   │   ├── routes/          # API route handlers
│   │   ├── services/        # Business logic services
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Utility functions
│   │   ├── prompts/         # LLM prompt templates
│   │   └── types/           # TypeScript type definitions
│   ├── prisma/              # Prisma schema & migrations
│   ├── scripts/             # Seed scripts, utilities
│   ├── tests/               # Backend tests
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── features/        # Feature-based modules
│   │   │   ├── auth/
│   │   │   ├── encounters/
│   │   │   └── training/
│   │   ├── routes/          # Route components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities, API client
│   │   ├── contexts/        # React contexts (Auth, etc.)
│   │   └── App.tsx
│   ├── public/
│   └── package.json
├── docs/                    # Documentation
│   ├── PRD-codeloom.md
│   └── ARCHITECTURE.md
├── .github/                 # CI/CD workflows
│   └── workflows/
├── .env.example
├── .gitignore
└── README.md
```

## Key Architectural Decisions

### 1. Single Repository (Monorepo)
- Keeps frontend and backend in sync
- Simplifies shared types and utilities
- Easier for Cursor/AI assistance

### 2. Service Layer Pattern
- Business logic separated from route handlers
- Services are testable in isolation
- Clear separation of concerns

### 3. Audit-First Design
- Every critical action creates an audit event
- Audit trail is immutable
- Enables compliance and debugging

### 4. LLM Abstraction
- `LLMClient` interface allows switching providers
- Prompts are templated and versioned
- Error handling and retries are centralized

### 5. Role-Based Access Control (RBAC)
- Middleware enforces role checks
- Practice-scoped data access
- Provider can only see their encounters; biller sees practice-wide

### 6. Encryption at Rest
- `noteText` encrypted before storage
- PHI handling follows HIPAA guidelines
- No PHI used for LLM training without explicit BAA

## Data Flow

### Encounter Creation & Suggestion Flow

1. **Provider creates encounter**
   - POST `/api/encounters` with `noteText`
   - Backend validates, encrypts `noteText`
   - Creates `Encounter` record with `status: "draft"`
   - Emits `ENCOUNTER_CREATED` audit event

2. **Provider requests AI suggestions**
   - POST `/api/encounters/:id/suggest`
   - `SuggestionService` processes note:
     - Trims/validates note (10k char limit)
     - Calls LLM for E/M + diagnoses
     - Calls LLM for procedures + risk
     - Applies rule layer
   - Updates `Encounter` with AI fields
   - Sets `status: "ai_suggested"`
   - Emits `AI_SUGGESTED_CODES` audit event

3. **Biller reviews and finalizes**
   - GET `/api/encounters/:id` (full encounter)
   - PATCH `/api/encounters/:id/codes` (save edits)
   - Computes deltas, emits audit events
   - POST `/api/encounters/:id/finalize`
   - Sets `status: "finalized"`, `finalizedAt`
   - Emits `USER_FINALIZED_CODES` audit event

## Security Considerations

### Authentication
- JWT access tokens (short-lived, 15 min)
- Refresh tokens (longer-lived, stored securely)
- Password hashing with bcrypt (salt rounds: 12)

### Authorization
- Role-based middleware: `requireAuth`, `requireRole("biller")`
- Practice-scoped queries (users can only access their practice's data)

### Data Protection
- Encryption at rest for `noteText` (AES-256)
- TLS in transit (HTTPS)
- No PHI in logs or error messages
- Audit trail for all PHI access

### Compliance
- HIPAA-aligned security posture
- Clear BAA requirements for LLM providers
- No training on PHI without explicit consent
- Export controls (no note snippets in analytics exports)

## Environment Configuration

### Development
- `.env.local` (gitignored)
- `.env.example` (template)

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/codeloom_dev

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# LLM Provider
LLM_PROVIDER=openai  # or anthropic
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...

# Encryption
ENCRYPTION_KEY=32-byte-key-for-aes-256

# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
```

## Testing Strategy

### Backend
- Unit tests for services (Jest/Vitest)
- Integration tests for API routes
- Database tests with test DB

### Frontend
- Component tests (React Testing Library)
- E2E tests (Playwright or Cypress) for critical flows

### CI/CD
- Run tests on PR
- Lint + typecheck
- Build verification

## Deployment Strategy

### Environments
- **Development:** Local development
- **Staging:** Pre-production testing
- **Production:** Live pilot practices

### Deployment Pipeline
1. Run tests
2. Build frontend and backend
3. Run database migrations
4. Deploy to environment
5. Health check verification

## Future Considerations

- Multi-tenancy enhancements
- EMR integrations (HL7 FHIR)
- Additional specialties beyond primary care
- Performance-based pricing hooks
- Advanced denial management workflows

