# Environment Variables Setup Guide

## Backend Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

### Required Variables

```bash
# Database - Supabase Connection
DATABASE_URL=postgresql://postgres.ygslfoweiigtiowjclve:QWERTyuiop1984!@aws-1-us-east-2.pooler.supabase.com:5432/postgres

# JWT Authentication (generate a secure random string, min 32 chars)
JWT_SECRET=your-secure-jwt-secret-min-32-characters-long

# Encryption Key (32-byte hex string for AES-256)
ENCRYPTION_KEY=your-32-byte-hex-encryption-key
```

### Optional Variables (with defaults)

```bash
# App Configuration
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info
API_BASE_PATH=/api

# LLM Configuration
# Set to 'mock' for testing without API keys
LLM_MODE=mock

# For OpenAI (when ready to use real AI):
# LLM_MODE=openai
# OPENAI_API_KEY=sk-your-openai-api-key-here
# OPENAI_MODEL=gpt-4o-mini

# For Anthropic (alternative):
# LLM_MODE=anthropic
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
# ANTHROPIC_MODEL=claude-3-haiku-20240307
```

### Generate Secure Secrets

To generate secure secrets, run:

```bash
# Generate JWT Secret (32+ characters)
openssl rand -base64 32

# Generate Encryption Key (32-byte hex)
openssl rand -hex 32
```

## Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

### Optional Variables (with defaults)

```bash
# API Base URL
# In development, defaults to /api (proxied to backend)
# In production, set to your backend URL
VITE_API_BASE_URL=/api

# App Version (optional)
VITE_APP_VERSION=0.0.1
```

## Quick Start

1. **Backend**: Copy `backend/env.example` to `backend/.env` and update with your values
2. **Frontend**: Create `frontend/.env` with the variables above (or leave empty to use defaults)

## Testing Setup

For local testing with mock LLM (no API keys needed):

```bash
# backend/.env
LLM_MODE=mock
```

For testing with real OpenAI:

```bash
# backend/.env
LLM_MODE=openai
OPENAI_API_KEY=sk-your-actual-key-here
OPENAI_MODEL=gpt-4o-mini
```

## Database Connection Notes

- **Session Pooler** (port 5432): Use for migrations and development
  - `postgresql://postgres.ygslfoweiigtiowjclve:password@aws-1-us-east-2.pooler.supabase.com:5432/postgres`
- **Direct Connection** (port 5432): May require IPv4 add-on
  - `postgresql://postgres:password@db.ygslfoweiigtiowjclve.supabase.co:5432/postgres`
- **Transaction Pooler** (port 6543): For production apps with many connections
  - `postgresql://postgres.ygslfoweiigtiowjclve:password@aws-1-us-east-2.pooler.supabase.com:6543/postgres`

For Prisma migrations, use the **Session Pooler** on port 5432.

