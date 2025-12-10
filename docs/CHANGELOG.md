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

