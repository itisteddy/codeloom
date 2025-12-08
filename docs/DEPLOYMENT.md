# Codeloom Deployment Guide

This guide covers deploying Codeloom to production using:
- **Render** for backend (Node.js/Express)
- **Supabase** for database (PostgreSQL)
- **Vercel** for frontend (React/Vite)

## Prerequisites

1. Accounts on:
   - Render (https://render.com)
   - Supabase (https://supabase.com)
   - Vercel (https://vercel.com)
2. GitHub repository (in `itisteddy` organization)
3. Environment variables ready

## Database Setup (Supabase)

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Create a new project
3. Note your project's connection string (Settings → Database → Connection string → URI)

### 2. Run Migrations

```bash
# Set DATABASE_URL to your Supabase connection string
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Run migrations
cd backend
pnpm prisma migrate deploy

# Generate Prisma client
pnpm prisma generate
```

## Backend Deployment (Render)

### 1. Create Web Service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository (`itisteddy/codeloom`)
3. Configure:
   - **Name**: `codeloom-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm start`

### 2. Environment Variables

Add these in Render Dashboard → Environment:

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Auth
JWT_SECRET=[generate-random-secret]
JWT_REFRESH_SECRET=[generate-random-secret]

# Encryption (for noteText at rest)
ENCRYPTION_KEY=[generate-32-byte-key]

# LLM
LLM_PROVIDER=mock  # or 'openai' for production
OPENAI_API_KEY=[if using OpenAI]
ANTHROPIC_API_KEY=[if using Anthropic]

# App Config
NODE_ENV=production
PORT=10000
LOG_LEVEL=info
FRONTEND_URL=https://your-frontend.vercel.app

# Public Base URL (for invite links)
PUBLIC_BASE_URL=https://your-frontend.vercel.app
```

### 3. Deploy

Render will automatically deploy on push to main branch.

## Frontend Deployment (Vercel)

### 1. Import Project

1. Go to Vercel Dashboard → Add New → Project
2. Import from GitHub (`itisteddy/codeloom`)
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`

### 2. Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# API Base URL (your Render backend URL)
VITE_API_BASE_URL=https://codeloom-backend.onrender.com

# App Version (optional)
VITE_APP_VERSION=0.0.1
```

### 3. Deploy

Vercel will automatically deploy on push to main branch.

## Post-Deployment Checklist

### 1. Database Seeding

Run seed script to create initial data:

```bash
# On Render, via shell or one-time job
cd backend
pnpm prisma db seed
```

### 2. Create First Practice & Admin

Use the onboarding endpoint or seed script:

```bash
POST https://your-backend.onrender.com/api/admin/onboarding/practice
{
  "practiceName": "Test Practice",
  "adminEmail": "admin@example.com",
  "adminPassword": "secure-password",
  "adminFirstName": "Admin",
  "adminLastName": "User"
}
```

### 3. Verify Health Checks

- Backend: `https://your-backend.onrender.com/health`
- Frontend: Should load and redirect to `/login`

### 4. Test Invite Flow

1. Login as admin
2. Go to `/admin/pilot/onboarding`
3. Create invites for providers/billers
4. Test invite acceptance flow

## Environment-Specific Configuration

### Development

- Backend: `http://localhost:4000`
- Frontend: `http://localhost:5173`
- Database: Local PostgreSQL or Supabase dev instance

### Staging

- Use separate Supabase project
- Use Render preview deployments
- Use Vercel preview deployments

### Production

- Use production Supabase project
- Use Render production service
- Use Vercel production deployment

## Monitoring & Logs

### Render

- View logs: Dashboard → Service → Logs
- Set up alerts: Dashboard → Service → Alerts

### Vercel

- View logs: Dashboard → Project → Deployments → View Function Logs
- Analytics: Dashboard → Project → Analytics

### Supabase

- View logs: Dashboard → Logs
- Monitor: Dashboard → Database → Connection Pooling

## Troubleshooting

### Backend won't start

- Check `DATABASE_URL` is correct
- Verify Prisma migrations ran: `pnpm prisma migrate status`
- Check logs in Render dashboard

### Frontend can't connect to backend

- Verify `VITE_API_BASE_URL` matches Render URL
- Check CORS settings in backend (`FRONTEND_URL`)
- Check browser console for errors

### Database connection issues

- Verify Supabase connection string
- Check IP allowlist in Supabase (if enabled)
- Verify connection pooling settings

## Security Checklist

- [ ] All secrets in environment variables (never commit)
- [ ] JWT secrets are strong and unique
- [ ] Database credentials are secure
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (if needed)
- [ ] HTTPS enforced (Render/Vercel default)
- [ ] Database backups enabled (Supabase default)

## Scaling Considerations

### Backend (Render)

- Upgrade to paid plan for better performance
- Enable auto-scaling if needed
- Use connection pooling for database

### Database (Supabase)

- Monitor connection limits
- Enable connection pooling
- Consider read replicas for high traffic

### Frontend (Vercel)

- Vercel handles scaling automatically
- Consider CDN caching for static assets
- Monitor bandwidth usage

## Support

For issues:
1. Check logs in respective platforms
2. Review error messages
3. Check environment variables
4. Verify database migrations

