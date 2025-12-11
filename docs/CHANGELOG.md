# Changelog

All notable changes to the Codeloom project will be documented in this file.

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

