# Codeloom – Pilot Readiness Guide

## Overview

This document describes how to deploy and operate Codeloom for pilot environments. Codeloom is a compliance-first billing intelligence platform that helps practices code encounters accurately using AI suggestions.

## Environments

Codeloom supports three environment types:

- **development** - Local development (default)
- **staging** - Pre-production testing environment
- **production** - Live pilot environment

Set `NODE_ENV` to one of these values to control environment-specific behavior.

## Required Environment Variables

### Backend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | No | Environment (development/staging/production) | `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens | `long-random-string` |
| `PORT` | No | Server port (default: 4000) | `4000` |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: http://localhost:5173) | `https://app.codeloom.example.com` |
| `LOG_LEVEL` | No | Logging level (default: info) | `info` |
| `API_BASE_PATH` | No | API base path (default: /api) | `/api` |
| `LLM_MODE` | No | LLM mode: mock/openai/anthropic (default: mock) | `mock` |
| `OPENAI_API_KEY` | No | OpenAI API key (if LLM_MODE=openai) | `sk-...` |
| `ANTHROPIC_API_KEY` | No | Anthropic API key (if LLM_MODE=anthropic) | `sk-ant-...` |

### Frontend

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `VITE_API_BASE_URL` | No | API base URL (default: /api) | `/api` or `https://api.codeloom.example.com/api` |
| `VITE_APP_VERSION` | No | App version for display (default: dev) | `0.10.0` |

## Local Development Setup

### Prerequisites

- Node.js 20+
- pnpm installed globally
- PostgreSQL running locally or accessible

### Steps

1. **Clone and install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up backend environment:**

   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your DATABASE_URL and JWT_SECRET
   ```

3. **Set up frontend environment:**

   ```bash
   cd frontend
   cp .env.development .env.local
   # Edit if needed
   ```

4. **Run database migrations:**

   ```bash
   pnpm --filter backend prisma:migrate:dev
   ```

5. **Seed database:**

   ```bash
   pnpm --filter backend seed
   ```

6. **Start backend:**

   ```bash
   pnpm --filter backend dev
   ```

   Backend will start on http://localhost:4000

7. **Start frontend:**

   ```bash
   pnpm --filter frontend dev
   ```

   Frontend will start on http://localhost:5173

## Pilot Environment Setup

### 1. Database Setup

Ensure PostgreSQL is running and accessible. Create a database:

```sql
CREATE DATABASE codeloom_pilot;
```

### 2. Environment Configuration

Create `.env` file in `/backend`:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/codeloom_pilot
JWT_SECRET=<generate-strong-secret>
PORT=4000
FRONTEND_URL=https://app.codeloom.example.com
LOG_LEVEL=info
LLM_MODE=mock
```

Create `.env.production` in `/frontend`:

```bash
VITE_API_BASE_URL=https://api.codeloom.example.com/api
VITE_APP_VERSION=0.10.0
```

### 3. Deploy Database Schema

```bash
pnpm --filter backend migrate:deploy
```

This runs all pending migrations without prompting.

### 4. Seed Pilot Data

```bash
pnpm --filter backend seed
```

This creates:
- Test Practice with provider@example.com and biller@example.com
- Pilot Practice Alpha with alpha.provider@demo.com and alpha.biller@demo.com
- Sample encounters (draft, ai_suggested, finalized)
- Training cases and attempts

**Default password for all seeded users:** `changeme123`

### 5. Verify Health Endpoints

Check that the application is running:

```bash
# Health check
curl http://localhost:4000/api/system/healthz
# Expected: {"status":"ok","env":"production"}

# Readiness check (includes DB connectivity)
curl http://localhost:4000/api/system/readyz
# Expected: {"status":"ready","db":"ok","env":"production"}

# Metrics
curl http://localhost:4000/api/system/metrics
# Expected: {"totalRequests":0,"total5xx":0,"perRoute5xx":{}}
```

## Monitoring & Observability

### Health Endpoints

- **GET /api/system/healthz** - Simple "I'm alive" check
  - Returns: `{ status: 'ok', env: <env> }`
  - Use for basic health checks

- **GET /api/system/readyz** - Readiness check with DB connectivity
  - Returns: `{ status: 'ready', db: 'ok', env: <env> }` on success
  - Returns: `{ status: 'degraded', db: 'error' }` (503) on failure
  - Use for Kubernetes readiness probes

- **GET /api/system/metrics** - In-memory metrics
  - Returns: `{ totalRequests: <number>, total5xx: <number>, perRoute5xx: {...} }`
  - Use for basic monitoring

### Logging

Backend logs are structured JSON:

```json
{"type":"http_request","ts":"2025-12-08T00:00:00.000Z","method":"GET","path":"/api/encounters","status":200,"durationMs":45,"userId":"user_123","practiceId":"practice_456"}
```

**PHI Safety:**
- No `noteText` in logs
- No `patientPseudoId` in logs
- Only structural metadata (user IDs, practice IDs, paths, status codes)

### Error Handling

- Errors return generic messages (no PHI)
- Frontend has error boundary for graceful crashes
- All errors logged server-side without PHI

## Default Test Users

After seeding, the following users are available:

### Test Practice

- **Provider:** `provider@example.com` / `changeme123`
- **Biller:** `biller@example.com` / `changeme123`

### Pilot Practice Alpha

- **Provider:** `alpha.provider@demo.com` / `changeme123`
- **Biller:** `alpha.biller@demo.com` / `changeme123`

## Troubleshooting

### Backend won't start

1. Check required env vars are set:
   ```bash
   echo $DATABASE_URL
   echo $JWT_SECRET
   ```

2. Verify database connectivity:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. Check logs for startup errors

### Frontend can't connect to backend

1. Verify `VITE_API_BASE_URL` is correct
2. Check CORS settings in backend (FRONTEND_URL)
3. Verify backend is running and accessible

### Database migration fails

1. Ensure database exists
2. Check DATABASE_URL is correct
3. Verify user has CREATE/ALTER permissions
4. Check for existing migrations conflicts

### Seed script fails

1. Ensure migrations have run first
2. Check database connectivity
3. Verify no duplicate email constraints (script is idempotent)

## Production Considerations

### Security

- Use strong `JWT_SECRET` (32+ random characters)
- Use HTTPS in production
- Set `NODE_ENV=production`
- Review CORS settings (`FRONTEND_URL`)
- Consider rate limiting for production

### Performance

- Use connection pooling (Prisma handles this)
- Monitor `/api/system/metrics` for 5xx errors
- Set up proper logging aggregation (e.g., Datadog, CloudWatch)

### Scaling

- Backend is stateless (can scale horizontally)
- Database connection pooling handles concurrent requests
- Consider Redis for session management (future)

## Next Steps

After pilot setup:

1. **Monitor metrics** - Watch `/api/system/metrics` for errors
2. **Review logs** - Check structured JSON logs for issues
3. **User feedback** - Collect feedback from pilot users
4. **Iterate** - Plan improvements based on pilot data

## Support

For issues during pilot:

1. Check health endpoints
2. Review application logs
3. Check database connectivity
4. Verify environment variables

---

**Version:** 0.10.0  
**Last Updated:** 2025-12-08

