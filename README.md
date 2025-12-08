# Codeloom

> Compliance-First Billing Coach for Healthcare Providers

Codeloom is an AI-powered billing coach application that helps healthcare providers and billers accurately code medical encounters while maintaining full audit trails and compliance readiness.

## Project Status

🚧 **Phase 0: Project Bootstrap & Hygiene** (Current)

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL 14+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/itisteddy/codeloom.git
cd codeloom

# Install dependencies
cd backend && pnpm install
cd ../frontend && pnpm install
```

### Environment Setup

1. Copy `.env.example` to `.env.local` in both `backend/` and `frontend/`
2. Configure your environment variables (see `docs/ARCHITECTURE.md`)

### Development

```bash
# Start backend (from backend/)
pnpm dev

# Start frontend (from frontend/)
pnpm dev
```

Backend runs on `http://localhost:3001`  
Frontend runs on `http://localhost:5173`

## Project Structure

```
codeloom/
├── backend/          # Node.js + TypeScript API
├── frontend/         # React + TypeScript SPA
├── docs/            # Documentation (PRD, Architecture)
└── README.md
```

## Documentation

- [PRD](./docs/PRD-codeloom.md) - Product Requirements Document
- [Architecture](./docs/ARCHITECTURE.md) - Technical architecture and decisions

## Phase Map

See [PRD](./docs/PRD-codeloom.md) for detailed phase breakdown:

- **Phase 0** – Project Bootstrap & Hygiene ✅ (Current)
- **Phase 1** – Domain Model & Data Layer
- **Phase 2** – Auth, Roles & Practice Management
- **Phase 3** – Encounter Flow Backend
- **Phase 4** – LLM Suggestion Engine
- **Phase 5** – Provider UI
- **Phase 6** – Biller UI
- **Phase 7** – Training / Education SKU
- **Phase 8** – Exports, Analytics & Metrics
- **Phase 9** – Security, Audit Trail & Compliance
- **Phase 10** – Pilot Readiness
- **Phase 11** – Post-MVP Enhancements

## Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS, Vite
- **Backend:** Node.js, TypeScript, Express, PostgreSQL, Prisma
- **Auth:** JWT with role-based access control
- **LLM:** OpenAI/Anthropic (configurable)

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Proprietary - All rights reserved

