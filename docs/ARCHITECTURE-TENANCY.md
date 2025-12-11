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

## Creating Tenants

**Development:**
- Run seed script: `pnpm prisma db seed`
- Creates sample tenant automatically

**Production (Future):**
- Platform admins will create organizations via admin console
- Practices created within organizations
- Users invited to practices via invite flow

## Notes

- Practice names are **never** hardcoded in UI code (except in seed scripts/tests)
- Practice name comes from `/api/me` endpoint which uses backend helpers
- All data is scoped to the current practice via `getCurrentPractice(req)`
- Multi-practice support is prepared but not yet implemented in UI

