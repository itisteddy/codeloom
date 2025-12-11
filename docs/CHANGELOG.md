# Changelog

All notable changes to the Codeloom project will be documented in this file.

---

## Phase 2 – Tenant Provisioning (Codeloom HQ / create-tenant)

### Backend Changes

- **Tenancy Service** (`src/services/tenancy.ts`):
  - Added `createTenant()` helper function for reusable tenant creation
  - Creates Organization → Practice → Subscription → Admin User → PracticeUser → UsagePeriod chain
  - Idempotent: reuses existing entities if they exist
  - Configurable via options (orgName, practiceName, adminEmail, planType, billingCycle, etc.)
  - Default admin password from `DEFAULT_TENANT_ADMIN_PASSWORD` env var (or "changeme123")

- **CLI Script** (`scripts/createTenant.ts`):
  - New `create-tenant` CLI tool for platform admins to provision new tenants
  - Command-line argument parsing (--org-name, --practice-name, --admin-email, etc.)
  - Validates arguments and provides helpful error messages
  - Prints summary of created entities on success
  - Added to `package.json` scripts: `pnpm create-tenant`

- **Seed Script Refactor** (`prisma/seed.ts`):
  - Refactored to use `createTenant()` helper for consistency
  - Sample tenant creation now shares same logic as CLI tool
  - Still creates Provider and Biller users separately (for dev convenience)
  - Ensures no drift between seed and CLI tenant creation

### Documentation Updates

- **ARCHITECTURE-TENANCY.md**:
  - Added "Tenant Provisioning" section
  - Documents CLI tool usage and backend helper
  - Explains idempotency and default password behavior

- **CHANGELOG.md**: This entry

- **VERIFICATION.md**: Added Phase 2 verification steps

### Notes

- Self-serve signup not yet implemented (future phase)
- Platform Admin web console not yet implemented (future phase)
- All tenant creation currently via CLI tool for internal use

---

## Phase 1 – Domain & Tenancy Cleanup

### Backend Changes

- **Prisma Schema Updates**:
  - Added `UserStatus` enum (ACTIVE, INVITED, INACTIVE)
  - Added `PracticeUser` join table model for user-practice memberships with roles
  - Made `Practice.orgId` required (was optional)
  - Added `Subscription.startDate` field
  - Added `UsagePeriod.aiCalls` field and unique constraint on (practiceId, periodStart)
  - Updated `User` model to include `practiceUsers` relation
  - Updated `Practice` model to include `practiceUsers` relation
  - User email is now globally unique (not just per-practice)

- **Tenancy Helpers** (`src/utils/tenancy.ts`):
  - `getCurrentUser(req)`: Returns authenticated user with relations
  - `getCurrentPractice(req)`: Returns current practice for user
  - `getCurrentOrg(req)`: Returns current organization for user
  - `getCurrentPracticeId(req)`: Returns practice ID helper
  - `getCurrentOrgId(req)`: Returns organization ID helper
  - Centralizes tenancy logic for easier multi-practice migration

- **API Updates**:
  - Updated `/api/me` to use tenancy helpers and return `practiceName`
  - Updated `/api/auth/login` to include `practiceName` in response

- **Seed Script Refactor** (`prisma/seed.ts`):
  - Created `createSampleTenant()` helper function
  - Creates Organization → Practice → Subscription → Users → PracticeUser chain
  - Creates Platform Admin user (`platform-admin@codeloom.app`)
  - All seed data now uses proper tenancy model
  - Idempotent: reuses existing entities if they exist

- **Migration** (`20251211_phase1_tenancy_cleanup`):
  - Creates `PracticeUser` table and `UserStatus` enum
  - Handles existing data gracefully (creates default org for practices without orgId)
  - Updates constraints and indexes

### Frontend Changes

- **Removed Hardcoded Practice Names**:
  - `AppShell.tsx`: Removed hardcoded "Sample Family Practice", now uses `user.practiceName` from backend
  - Practice name now comes from `/api/me` endpoint

- **Auth Context Updates**:
  - Added `practiceName` field to `AuthUser` interface
  - Login flow fetches full user data from `/api/me` to get practice name
  - Practice name displayed in UI comes from backend, not hardcoded

### Documentation

- **New File**: `docs/ARCHITECTURE-TENANCY.md`
  - Describes Organization, Practice, User, PracticeUser, Subscription, Usage models
  - Explains relationships and data flow
  - Documents backend helpers
  - Describes seed data structure
  - Notes migration path for future phases

---

## Phase 2 – HIPAA-ish Data Handling & Visibility

### Backend Changes

- **Practice Model (Prisma)**: Added `phiRetentionDays` (Int?) and `storePhiAtRest` (Boolean, default true) fields to Practice model
- **Admin Security Endpoints**: 
  - `GET /api/admin/security` - Retrieve PHI security settings for practice
  - `POST /api/admin/security` - Update PHI security settings (admin-only)
- **PHI-Safe Logging Utility** (`src/utils/logger.ts`):
  - Created `scrubForLogging()` function to remove PHI-sensitive fields from log metadata
  - Implemented `logInfo()`, `logWarn()`, `logError()` wrappers that automatically scrub PHI
  - Scrubs fields: note, noteText, text, body, patientName, patientId, patientPseudoId, dob, mrn, email, phone, address
- **PHI Retention Service** (`src/services/phiRetentionService.ts`):
  - `applyPhiRetentionForPractice()` - Redacts PHI from encounters based on practice settings
  - `applyPhiRetentionForAllPractices()` - Batch processing for scheduled jobs
  - Redacts noteText and patientPseudoId while preserving codes, timestamps, and audit info
- **Dev-Only Endpoint** (`POST /api/dev/phi-retention/apply`):
  - Manual trigger for PHI retention (only available when APP_ENV=dev)
  - Accepts optional `practiceId` parameter

### Frontend Changes

- **Admin Security & Data Page** (`/admin/security`):
  - New page accessible only to admin users
  - Displays current PHI retention and storage settings
  - Form to update `phiRetentionDays` (options: Keep until deleted, 30, 90, 180, 365 days)
  - Toggle for `storePhiAtRest` with warning message when disabled
  - Dev-only section with "Apply Retention Now" button for testing
- **Navigation**: Added "Security & Data" link to Admin section in sidebar
- **API Client**: Added `getSecuritySettings()`, `updateSecuritySettings()`, and `applyPhiRetention()` functions

### Database Migration

- Migration: `20251210_add_phi_settings` - Adds `phiRetentionDays` and `storePhiAtRest` columns to Practice table

---

## Sub-phase A – Roles, Navigation & Analytics Cleanup

### Backend Changes

- **UserRole Enum Update**: Extended Prisma enum to include PRD-compliant roles:
  - `provider` - Clinical staff who document encounters
  - `biller` - Coding specialists who finalize codes
  - `practice_admin` - Practice owners/admins who manage team, billing, and settings
  - `platform_admin` - Codeloom internal staff with cross-tenant access
- **Admin Routes**: Updated `requireAdminRole` middleware to accept `practice_admin`, `platform_admin`, and legacy `admin` roles
- **Migration**: `20251210_update_user_roles` - Adds new role values and migrates existing `admin` users to `practice_admin`

### Frontend Changes

- **Role Types** (`src/types/roles.ts`):
  - Created shared role type definitions matching PRD
  - Added helper functions: `isAdmin()`, `canAccessAnalytics()`, `canAccessAdmin()`, `getRoleLabel()`, `normalizeRole()`
- **Auth Context**: Updated to normalize legacy `admin` role to `practice_admin`
- **Navigation (AppShell)**:
  - Providers/Billers see: Encounters, Training, Settings
  - Practice Admins/Platform Admins see: Encounters, Training, Analytics, Admin, Settings
- **Route Guards**:
  - Added `AdminRoute` component that redirects non-admins to `/encounters`
  - Analytics route (`/analytics`) now requires admin role
  - All `/admin/*` routes require admin role
- **Admin Landing Page** (`/admin`):
  - New hub page with links to Team, Billing & Plan, Security & Data
  - Clear descriptions of each admin function
- **Settings Page** (`/settings`):
  - Personal profile page accessible to all users
  - Shows name, email, role (read-only for now)
  - Placeholder sections for Preferences and Security (to be expanded in Sub-phase C)
- **Analytics Page**:
  - Removed in-app NPS widget (NPS will be collected outside the app)
  - Updated copy to emphasize practice-level metrics:
    - "Practice Encounters" instead of "Total Encounters"
    - "Practice usage rate" and "practice avg" labels
    - "See how Codeloom is being used across your practice" subheading
  - Applied consistent Card-based UI styling

---

## Sub-phase B – Tenant Model & Admin Team/Billing Skeleton

### Backend Changes

- **Organization Model**: New model for customer accounts with billing contact info
- **Subscription Model**: New model with planType (starter/growth/enterprise), billingCycle (monthly/annual), status, renewalDate, and includedLimits
- **UsagePeriod Enhanced**: Added `encountersWithAiSuggestions`, `encountersFinalized`, `activeProviders` fields
- **Usage Service** (`src/services/usageService.ts`):
  - `getOrCreateCurrentPeriodUsage()` - Gets/creates current billing period
  - `incrementEncounterWithAiSuggestion()` - Track AI suggestion usage
  - `incrementEncounterFinalized()` - Track finalized encounters
  - `incrementTrainingAttempt()` - Track training activity
  - `getCurrentUsageSummary()` - Get usage summary for billing
- **Admin Billing API Enhanced**: 
  - Now returns planType, billingCycle, subscriptionStatus, renewalDate
  - Returns structured `includedLimits` and `currentUsage` objects
  - Returns `features` object for training/analytics/exports flags

### Frontend Changes

- **BillingInfo Type Updated**: Added PlanType, BillingCycle, SubscriptionStatus, IncludedLimits, CurrentUsage, BillingFeatures
- **Admin Billing Page Enhanced**:
  - Shows plan type (Starter/Growth/Enterprise) with status badge
  - Shows billing cycle and renewal date
  - Detailed usage stats: encounters created, finalized, AI calls, training attempts
  - Usage progress bar with color-coded thresholds
  - Contact support CTA for plan changes
- **Team Page**: Updated role badge logic for practice_admin/platform_admin

### Database Migration

- Migration: `20251210_org_subscription_model` - Adds Organization, Subscription models and extends Practice/UsagePeriod

---

## Sub-phase C – Per-User Settings / Profile

### Backend Changes

- **UserPreferences Model**: New model for storing user-specific settings:
  - theme (light/dark/system)
  - timeZone (user's preferred timezone)
  - dateFormat (MM/DD/YYYY or DD/MM/YYYY)
  - notificationPrefs (JSON: emailAssignments, emailWeeklySummary)
  - Role-specific preferences (providerPrefs, billerPrefs, adminPrefs)
- **New /api/me Routes** (`src/routes/me.ts`):
  - `GET /api/me` - Get current user info with practice/org context
  - `GET /api/me/settings` - Get user preferences
  - `PUT /api/me/settings` - Update user preferences
  - `PUT /api/me/profile` - Update user name
  - `POST /api/me/change-password` - Change password with validation

### Frontend Changes

- **Settings API Client** (`src/api/me.ts`):
  - Types for CurrentUser, UserSettings, ChangePasswordRequest
  - Functions: getCurrentUser, getSettings, updateSettings, updateProfile, changePassword
- **Settings Page Enhanced** (`/settings`):
  - **Profile Section**: Edit first/last name, view email and role
  - **Preferences Section**:
    - Theme selector (System/Light/Dark)
    - Time zone dropdown (US timezones + UTC)
    - Date format selector
    - Notification preferences (email toggles)
    - Role-specific settings:
      - Provider: "Run Codeloom automatically after saving note"
      - Biller: "Auto-open Suggestions panel when opening encounter"
  - **Security Section**: Password change form with validation

### Database Migration

- Migration: `20251210_user_preferences` - Adds UserPreferences table with 1:1 relationship to User

