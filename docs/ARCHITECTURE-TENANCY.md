# Tenancy Architecture

This document describes the data model and relationships for multi-tenant support in Codeloom.

## Overview

Codeloom uses a hierarchical tenancy model:
- **Organization**: The legal customer entity (billing account)
- **Practice**: A clinical practice within an organization (can have multiple practices per org)
- **User**: A person who uses Codeloom
- **PracticeUser**: Join table linking users to practices with role assignments

## Data Model

### Organization

The top-level tenant entity representing a customer account.

**Fields:**
- `id`: Unique identifier
- `name`: Organization name
- `billingContactName`: Primary billing contact
- `billingContactEmail`: Billing email
- `billingAddress`: Billing address (optional)

**Relations:**
- `practices`: Practices belonging to this organization
- `subscriptions`: Subscription plans for this organization

**Usage:**
- Organizations are created via platform admin flows (future phase)
- In development, seeds create a sample organization for testing

### Practice

A clinical practice within an organization. This is the primary unit of data isolation.

**Fields:**
- `id`: Unique identifier
- `orgId`: Foreign key to Organization (required)
- `name`: Practice name
- `specialty`: Primary specialty (optional)
- `timeZone`: Practice timezone (default: "America/New_York")

**Relations:**
- `organization`: Parent organization
- `users`: Legacy direct users (via `practiceId` - for backward compatibility)
- `practiceUsers`: Users via PracticeUser join table (preferred)
- `encounters`: Clinical encounters
- `usagePeriods`: Usage tracking per billing period

**Usage:**
- Practices are created when an organization is set up
- Each practice has its own encounters, users, and usage tracking
- In development, seeds create "Sample Family Practice"

### User

A person who uses Codeloom. Users can belong to multiple practices via the PracticeUser join table.

**Fields:**
- `id`: Unique identifier
- `email`: Email address (globally unique)
- `passwordHash`: Hashed password
- `firstName`: First name
- `lastName`: Last name
- `role`: Primary role (for backward compatibility)
- `practiceId`: Primary practice (for backward compatibility)
- `isActive`: Whether the user account is active

**Relations:**
- `practice`: Primary practice (legacy, via `practiceId`)
- `practiceUsers`: Practice memberships via join table
- `encounters`: Encounters where user is the provider
- `preferences`: User preferences/settings

**Usage:**
- Users are created via invite flows or seed scripts
- For Phase 1, users still have a primary `practiceId` for backward compatibility
- Future phases will fully migrate to PracticeUser join table

### PracticeUser

Join table representing membership of a User in a Practice with a specific role.

**Fields:**
- `id`: Unique identifier
- `practiceId`: Foreign key to Practice
- `userId`: Foreign key to User
- `role`: Role in this practice (PROVIDER, BILLER, PRACTICE_ADMIN)
- `status`: Membership status (ACTIVE, INVITED, INACTIVE)
- `createdAt`: When the membership was created

**Constraints:**
- `@@unique([practiceId, userId])`: A user can have at most one membership per practice

**Usage:**
- Created when a user is invited to or joins a practice
- Allows users to belong to multiple practices with different roles
- Phase 1: Still using `user.practiceId` for backward compatibility, but PracticeUser is created in parallel

### Subscription

Commercial relationship between an Organization and Codeloom.

**Fields:**
- `id`: Unique identifier
- `orgId`: Foreign key to Organization
- `planType`: Plan tier (STARTER, GROWTH, ENTERPRISE)
- `billingCycle`: Billing frequency (MONTHLY, ANNUAL)
- `status`: Subscription status (ACTIVE, TRIALING, CANCELED, PAST_DUE)
- `startDate`: When the subscription started
- `renewalDate`: Next renewal date
- `includedLimits`: JSON object with plan limits (maxEncountersPerMonth, maxProviders, etc.)
- `externalBillingId`: External billing system ID (e.g., Stripe)

**Relations:**
- `organization`: Parent organization

**Usage:**
- Created when an organization subscribes to a plan
- In development, seeds create a STARTER subscription for the sample organization

### UsagePeriod

Tracks usage metrics for a practice over a billing period.

**Fields:**
- `id`: Unique identifier
- `practiceId`: Foreign key to Practice
- `periodStart`: Start of the billing period
- `periodEnd`: End of the billing period
- `encountersCreated`: Number of encounters created
- `encountersWithAiSuggestions`: Number of encounters with AI suggestions
- `encountersFinalized`: Number of finalized encounters
- `aiCalls`: Number of AI API calls
- `trainingAttempts`: Number of training attempts
- `activeProviders`: Number of active providers

**Relations:**
- `practice`: Parent practice

**Usage:**
- Created/updated automatically as users interact with the system
- Used for billing and analytics

## Relationships Diagram

```
Organization
  ├── practices: Practice[]
  ├── subscriptions: Subscription[]
  │
Practice
  ├── organization: Organization
  ├── users: User[] (legacy, via practiceId)
  ├── practiceUsers: PracticeUser[]
  ├── encounters: Encounter[]
  └── usagePeriods: UsagePeriod[]
  │
User
  ├── practice: Practice (legacy, via practiceId)
  ├── practiceUsers: PracticeUser[]
  └── preferences: UserPreferences
  │
PracticeUser
  ├── practice: Practice
  └── user: User
```

## Backend Helpers

Centralized helpers for resolving tenancy context:

- `getCurrentUser(req)`: Returns the authenticated user with relations
- `getCurrentPractice(req)`: Returns the current practice for the user
- `getCurrentOrg(req)`: Returns the current organization for the user
- `getCurrentPracticeId(req)`: Returns just the practice ID
- `getCurrentOrgId(req)`: Returns just the organization ID

**Location:** `backend/src/utils/tenancy.ts`

**Usage:**
```typescript
import { getCurrentPractice } from '../utils/tenancy';

router.get('/encounters', requireAuth, async (req, res) => {
  const practice = await getCurrentPractice(req);
  // Use practice.id for queries
});
```

## Seed Data

The seed script (`backend/prisma/seed.ts`) creates:

1. **Sample Tenant** (`createSampleTenant()`):
   - Organization: "Sample Family Practice"
   - Practice: "Sample Family Practice"
   - Subscription: STARTER plan, monthly billing
   - Users:
     - `provider@example.com` (PROVIDER)
     - `biller@example.com` (BILLER)
     - `admin@example.com` (PRACTICE_ADMIN)
   - PracticeUser records for each user

2. **Platform Admin**:
   - `platform-admin@codeloom.app` (PLATFORM_ADMIN)
   - Not tied to any practice

3. **Pilot Practice** (for backward compatibility):
   - "Pilot Practice Alpha" with its own organization
   - Pilot users and sample encounters

## Migration Path

**Phase 1 (Current):**
- PracticeUser join table exists and is populated
- Users still have `practiceId` for backward compatibility
- Backend helpers use `practiceId` but structure supports PracticeUser

**Future Phases:**
- Migrate all queries to use PracticeUser
- Support users belonging to multiple practices
- Remove `practiceId` from User model (breaking change)

## Tenant Provisioning

Codeloom has two types of administrators:
- **Platform Admins**: Internal Codeloom staff who manage the platform and create new tenants
- **Practice Admins**: Customer-side administrators who manage their practice's team, billing, and settings

### Creating New Tenants

New tenants (Organizations + Practices + Subscriptions + Admin Users) are created via an internal CLI tool. Self-serve signup is not yet enabled; pilots are provisioned manually by platform admins.

#### CLI Tool: `create-tenant`

**Location:** `backend/scripts/createTenant.ts`

**Usage:**
```bash
pnpm create-tenant \
  --org-name "Sunrise Primary Care LLC" \
  --practice-name "Sunrise Primary Care" \
  --admin-email "owner@sunrisepeds.com" \
  --plan-type STARTER \
  --billing-cycle MONTHLY
```

**What it creates:**
1. **Organization**: The legal customer entity
2. **Practice**: A clinical practice under that organization
3. **Subscription**: A subscription plan (STARTER, GROWTH, or ENTERPRISE) with billing cycle
4. **Admin User**: A Practice Admin user with the specified email
5. **PracticeUser**: Links the admin user to the practice with PRACTICE_ADMIN role
6. **UsagePeriod**: Initializes usage tracking for the current billing period

**Idempotency:**
- The tool is idempotent - it will reuse existing entities if they exist
- Safe to run multiple times with the same parameters
- Logs warnings when reusing existing entities

**Default Admin Password:**
- Default password is `changeme123` (or value from `DEFAULT_TENANT_ADMIN_PASSWORD` env var)
- Admins should reset their password via the password reset flow after first login

#### Backend Helper: `createTenant()`

**Location:** `backend/src/services/tenancy.ts`

The CLI tool uses the reusable `createTenant()` helper function, which is also used by the seed script to ensure consistency.

**Function signature:**
```typescript
async function createTenant(options: CreateTenantOptions): Promise<CreateTenantResult>
```

**Options:**
- `orgName`: Organization name (required)
- `practiceName`: Practice name (optional, defaults to orgName)
- `adminEmail`: Admin user email (required)
- `adminName`: Admin user full name (optional, defaults to "Admin User")
- `planType`: Plan type - STARTER, GROWTH, or ENTERPRISE (default: STARTER)
- `billingCycle`: Billing cycle - MONTHLY or ANNUAL (default: MONTHLY)
- `status`: Subscription status (default: ACTIVE)
- `specialty`: Practice specialty (optional)
- `timeZone`: Practice timezone (default: "America/Chicago")

**Development:**
- Run seed script: `pnpm prisma db seed`
- Creates sample tenant automatically using the same `createTenant()` helper

**Production (Future):**
- Platform admins will create organizations via admin console (future phase)
- Practices created within organizations
- Users invited to practices via invite flow

## Codeloom HQ (Platform Admin Console)

**Codeloom HQ** is an internal-only console for Platform Admins to view and manage organizations, practices, subscriptions, and usage across the entire platform.

### Access

- **URL**: `/hq` (overview) and `/hq/orgs/:orgId` (org detail)
- **Role Required**: `PLATFORM_ADMIN` only
- **Navigation**: "HQ" nav item appears only for Platform Admin users

### Features

1. **HQ Overview** (`/hq`):
   - Table of all organizations with:
     - Organization name, plan type, billing cycle, status
     - Practice count, user counts (providers, billers, admins)
     - Usage metrics (AI encounters, finalized encounters, training attempts)
     - Last activity date
     - NPS scores (if available)
   - Filters: Plan type, Status, Search by org name/email
   - Click any row to view org detail

2. **Org Detail** (`/hq/orgs/:orgId`):
   - Organization header with plan info, dates, status
   - Practices table showing:
     - Practice name, specialty, timezone
     - User counts by role
     - Usage metrics per practice
     - Last activity
   - NPS & Feedback section:
     - Average NPS score
     - Response count
     - Latest comments (last 10)

### Backend APIs

- `GET /api/hq/overview`: Returns list of organizations with aggregated usage
- `GET /api/hq/orgs/:orgId`: Returns detailed org information

All HQ routes are protected by `requireRole([UserRole.platform_admin])` middleware.

### Security

- Only `PLATFORM_ADMIN` users can access HQ routes
- Non-platform-admin users are redirected to `/encounters` if they attempt to access HQ
- All HQ API calls are logged for audit purposes

## Notes

- Practice names are **never** hardcoded in UI code (except in seed scripts/tests)
- Practice name comes from `/api/me` endpoint which uses backend helpers
- All data is scoped to the current practice via `getCurrentPractice(req)`
- Multi-practice support is prepared but not yet implemented in UI
- Platform Admins don't have a practice context and use HQ for cross-tenant visibility

