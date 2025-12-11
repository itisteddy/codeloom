# Verification Guide

This document provides step-by-step instructions for manually verifying features after each phase.

## Phase 2 – HIPAA-ish Data Handling & Visibility

### Prerequisites

- Deployed frontend and backend
- Admin user account (email: `admin@example.com`, password: `changeme123` - or upgrade existing user to admin)
- At least one encounter with note text in the database

### Verification Steps

#### 1. Verify Admin Security & Data Page

1. **Login as Admin**
   - Go to: `https://codeloom-frontend-seven.vercel.app/login`
   - Email: `admin@example.com` (or your admin email)
   - Password: `changeme123`

2. **Navigate to Security & Data**
   - In the sidebar, click **Admin** → **Security & Data**
   - You should see a page titled "Security & Data" with two sections:
     - PHI Retention Period (dropdown)
     - Store PHI at Rest (toggle)

3. **Verify Settings Load**
   - Page should load without errors
   - Default values should display:
     - PHI Retention: "Keep until deleted"
     - Store PHI at Rest: Enabled (toggle ON)

#### 2. Verify Settings Update

1. **Change PHI Retention**
   - Select "30 days" from the dropdown
   - Click "Save Settings"
   - You should see a green success message: "Settings saved successfully"

2. **Toggle Store PHI at Rest**
   - Turn OFF the "Store PHI at Rest" toggle
   - You should see a yellow warning: "⚠️ Warning: Disabling PHI at rest will redact note text..."
   - Click "Save Settings"
   - Verify success message appears

3. **Refresh and Verify Persistence**
   - Refresh the page (F5 or Cmd+R)
   - Settings should persist:
     - PHI Retention: "30 days"
     - Store PHI at Rest: Disabled (toggle OFF)

#### 3. Verify PHI-Safe Logging (Backend)

1. **Check Backend Logs**
   - In Render dashboard, view backend logs
   - Trigger an action that logs data (e.g., create an encounter, run suggestions)
   - Inspect log entries

2. **Verify No PHI in Logs**
   - Logs should NOT contain:
     - Raw note text
     - Patient names or IDs
     - Patient pseudo IDs
   - Logs SHOULD contain:
     - Encounter IDs
     - Practice IDs
     - User IDs
     - Timestamps
     - Status codes

3. **Example Log Entry (Good)**
   ```
   [INFO] Applying PHI retention for practice {
     practiceId: "abc123",
     practiceName: "Test Practice",
     phiRetentionDays: 30,
     storePhiAtRest: false
   }
   ```

4. **Example Log Entry (Bad - should NOT appear)**
   ```
   [INFO] Processing encounter {
     noteText: "Patient presents with diabetes..."  // ❌ Should be scrubbed
     patientPseudoId: "patient_001"  // ❌ Should be scrubbed
   }
   ```

#### 4. Verify PHI Retention (Dev Mode Only)

**Note:** This section only works when `APP_ENV=dev` and `VITE_APP_ENV=dev`

1. **Enable Dev Mode**
   - Ensure backend has `APP_ENV=dev` in environment variables
   - Ensure frontend has `VITE_APP_ENV=dev` in environment variables
   - Redeploy if needed

2. **Create Test Encounter**
   - Go to Encounters → Create New
   - Add note text: "Test patient with diabetes. Blood pressure 120/80."
   - Save the encounter
   - Note the encounter ID or patient pseudo ID

3. **Apply Retention**
   - Go to Admin → Security & Data
   - Scroll to "Dev Tools" section (should be visible in dev mode)
   - Click "Apply Retention Now"
   - Wait for success message

4. **Verify PHI Redaction**
   - Go back to Encounters
   - Open the encounter you created
   - **Expected Result:**
     - Note text should be empty or blank
     - Patient pseudo ID should show "REDACTED"
     - Other metadata (codes, timestamps, status) should still be present

5. **Verify Retention Settings Work**
   - Change PHI Retention to "90 days"
   - Save settings
   - Create a new encounter with note text
   - Manually set the encounter date to 100 days ago (via SQL or admin tool)
   - Apply retention again
   - The old encounter should have redacted PHI, but the new one should not (if it's less than 90 days old)

#### 5. Verify Production Safety

1. **Dev Endpoint Not Available in Production**
   - Set `APP_ENV=pilot` or `APP_ENV=prod`
   - Redeploy backend
   - Try to call `POST /api/dev/phi-retention/apply`
   - Should return 403: "This endpoint is only available in dev environment"

2. **Dev Tools Not Visible in Production**
   - Set `VITE_APP_ENV=pilot` or `VITE_APP_ENV=prod`
   - Redeploy frontend
   - Go to Admin → Security & Data
   - "Dev Tools" section should NOT be visible

### Summary Checklist

- [ ] Admin Security & Data page loads and displays current settings
- [ ] Settings can be updated and persist after refresh
- [ ] Warning message appears when disabling "Store PHI at Rest"
- [ ] Backend logs do not contain note text or patient identifiers
- [ ] PHI retention can be manually triggered in dev mode
- [ ] PHI is redacted from encounters after retention is applied
- [ ] Dev endpoint returns 403 in non-dev environments
- [ ] Dev tools section is hidden in non-dev frontend builds

### Notes

- **Scheduling**: In a real production deployment, `applyPhiRetentionForAllPractices()` should be scheduled to run daily via a cron job, cloud scheduler, or queue system. For now, the dev-only endpoint allows manual testing.

- **Logging**: The PHI-safe logger automatically scrubs sensitive fields. Always use `logInfo()`, `logWarn()`, or `logError()` instead of direct `console.log()` when logging request data or encounter objects.

- **Retention Behavior**: 
  - If `storePhiAtRest = false`: All encounters have PHI redacted immediately
  - If `phiRetentionDays = 30`: Only encounters older than 30 days have PHI redacted
  - If both are set: The more restrictive policy applies

---

## Sub-phase A – Roles, Navigation & Analytics Cleanup

### Prerequisites

- Deployed frontend and backend with Sub-phase A changes
- Test users with different roles:
  - Provider: `provider@example.com` / `changeme123`
  - Biller: `biller@example.com` / `changeme123`
  - Practice Admin: Update an existing user to `practice_admin` role via SQL

### Verification Steps

#### 1. Verify Navigation for Provider/Biller

1. **Login as Provider**
   - Go to login page
   - Email: `provider@example.com`
   - Password: `changeme123`

2. **Check Navigation**
   - Sidebar should show ONLY:
     - Encounters
     - Training
     - Settings
   - Should NOT see: Analytics, Admin

3. **Attempt Direct URL Access**
   - Manually navigate to `/analytics` in browser
   - Should be redirected to `/encounters`
   - Manually navigate to `/admin`
   - Should be redirected to `/encounters`

4. **Repeat for Biller**
   - Logout and login as `biller@example.com`
   - Verify same navigation (Encounters, Training, Settings only)

#### 2. Verify Navigation for Practice Admin

1. **Create or Upgrade Admin User**
   - Run in Supabase SQL Editor:
   ```sql
   UPDATE "User" SET role = 'practice_admin' WHERE email = 'biller@example.com';
   ```
   - Or create new admin user

2. **Login as Practice Admin**
   - Login with the admin user

3. **Check Navigation**
   - Sidebar should show:
     - Encounters
     - Training
     - Analytics
     - Admin
     - Settings

4. **Access Analytics**
   - Click Analytics
   - Page should load without redirect
   - Should see practice-level metrics:
     - "See how Codeloom is being used across your practice"
     - "Practice Encounters"
     - "Practice usage rate"

5. **Access Admin Landing**
   - Click Admin
   - Should see Admin landing page with cards:
     - Team (👥)
     - Billing & Plan (💳)
     - Security & Data (🔒)

6. **Navigate Admin Sub-pages**
   - Click "Manage" on Team card → goes to `/admin/team`
   - Click "Manage" on Billing card → goes to `/admin/billing`
   - Click "Manage" on Security card → goes to `/admin/security`

#### 3. Verify Analytics Page (NPS Removed)

1. **Login as Practice Admin**

2. **Go to Analytics**

3. **Verify No NPS Widget**
   - Page should NOT show "How likely are you to recommend Codeloom..."
   - Should only show metrics and export section

4. **Verify Practice-Level Copy**
   - Headers should say "Practice Encounters", not "Total Encounters"
   - Should see "practice usage rate" and "practice avg" labels

#### 4. Verify Personal Settings Page

1. **Login as Any User**

2. **Click Settings in Navigation**

3. **Verify Settings Page**
   - Should see "Settings" heading with "Manage your personal profile and preferences"
   - Profile section showing:
     - First Name (read-only)
     - Last Name (read-only)
     - Email (read-only)
     - Role badge
   - Preferences section (placeholder)
   - Security section (placeholder)

4. **Verify All Roles Can Access**
   - Login as Provider → can access `/settings`
   - Login as Biller → can access `/settings`
   - Login as Practice Admin → can access `/settings`

### Summary Checklist

- [ ] Provider/Biller navigation shows only: Encounters, Training, Settings
- [ ] Practice Admin navigation shows: Encounters, Training, Analytics, Admin, Settings
- [ ] Non-admins redirected from `/analytics` to `/encounters`
- [ ] Non-admins redirected from `/admin/*` to `/encounters`
- [ ] Analytics page does NOT show NPS widget
- [ ] Analytics page uses practice-level language
- [ ] Admin landing page shows Team, Billing, Security cards
- [ ] Personal Settings page accessible to all users
- [ ] Role labels display correctly (Provider, Biller, Practice Admin)

---

## Sub-phase B – Tenant Model & Admin Team/Billing Skeleton

### Prerequisites

- Deployed frontend and backend with Sub-phase B changes
- Practice Admin user account

### Verification Steps

#### 1. Verify Admin Billing Page

1. **Login as Practice Admin**
   - Go to login page and login with a practice_admin user

2. **Navigate to Admin → Billing & Plan**
   - Click "Admin" in sidebar
   - Click "Manage" on Billing & Plan card

3. **Verify Plan Information**
   - Should see plan type (Starter/Growth/Enterprise)
   - Should see billing cycle (Monthly/Annual)
   - Should see status badge (Active/Trial/etc.)
   - Should see renewal date if applicable

4. **Verify Usage Statistics**
   - Should see current period dates
   - Should see encounters with AI suggestions count
   - Should see progress bar with color coding:
     - Green: < 70% usage
     - Amber: 70-90% usage
     - Red: > 90% usage
   - Should see detailed stats:
     - Encounters Created
     - Encounters Finalized
     - AI Calls
     - Training Attempts

5. **Verify Contact CTA**
   - "Contact us to change plan" button should open email
   - "Contact Support" button should open email

#### 2. Verify Admin Team Page

1. **Navigate to Admin → Team**

2. **Verify User List**
   - Should see all users in practice
   - Should see columns: Name, Email, Role, Status, Created
   - Role badges should be color-coded:
     - Practice Admin: Warning (amber)
     - Biller: Info (teal)
     - Provider: Default (gray)

3. **Verify Role Change**
   - Select a different role from dropdown
   - Confirm change is saved

4. **Verify Invite Form**
   - Click "Invite User"
   - Fill in email and select role
   - Submit and verify invite appears in pending list

### Summary Checklist

- [ ] Admin Billing page shows plan type and billing cycle
- [ ] Admin Billing page shows subscription status badge
- [ ] Admin Billing page shows current period usage stats
- [ ] Usage progress bar shows correct percentage and color
- [ ] Contact buttons open email with correct subject
- [ ] Team page shows all users with correct role badges
- [ ] Role change works from dropdown
- [ ] Invite form creates pending invite

---

## Sub-phase C – Per-User Settings / Profile

### Prerequisites

- Deployed frontend and backend with Sub-phase C changes
- User accounts with different roles (Provider, Biller, Practice Admin)

### Verification Steps

#### 1. Verify Settings Page Access

1. **Login as any user**
   - Go to login page and login

2. **Navigate to Settings**
   - Click "Settings" in the sidebar
   - Should see Settings page with Profile, Preferences, and Security sections

#### 2. Verify Profile Section

1. **View Profile Info**
   - Should see current first name and last name in input fields
   - Email should be shown but disabled (read-only)
   - Role badge should display correctly

2. **Update Profile**
   - Change first name and/or last name
   - Click "Save Profile"
   - Should see success message
   - Refresh page and verify changes persist

#### 3. Verify Preferences Section

1. **Theme Selection**
   - Should see radio buttons for System/Light/Dark
   - Select different theme and save
   - Verify selection persists after refresh

2. **Time Zone**
   - Should see dropdown with timezone options
   - Select different timezone and save
   - Verify selection persists after refresh

3. **Date Format**
   - Should see radio buttons for MM/DD/YYYY and DD/MM/YYYY
   - Select different format and save
   - Verify selection persists after refresh

4. **Notification Preferences**
   - Toggle email assignment notifications
   - Toggle weekly summary email
   - Click "Save Preferences"
   - Verify selections persist after refresh

5. **Role-Specific Settings (Provider)**
   - Login as Provider
   - Should see "Provider Settings" section
   - Toggle "Run Codeloom automatically after saving note"
   - Save and verify persistence

6. **Role-Specific Settings (Biller)**
   - Login as Biller
   - Should see "Biller Settings" section
   - Toggle "Auto-open Suggestions panel when opening encounter"
   - Save and verify persistence

#### 4. Verify Password Change

1. **Attempt with wrong current password**
   - Enter wrong current password
   - Enter new password and confirm
   - Click "Change Password"
   - Should see error: "Current password is incorrect"

2. **Attempt with mismatched passwords**
   - Enter correct current password
   - Enter different new passwords
   - Click "Change Password"
   - Should see error: "New passwords do not match"

3. **Attempt with short password**
   - Enter correct current password
   - Enter password less than 8 characters
   - Click "Change Password"
   - Should see error about minimum length

4. **Successful password change**
   - Enter correct current password
   - Enter new password (8+ characters) in both fields
   - Click "Change Password"
   - Should see success message
   - Logout and login with new password
   - Should be able to login successfully

### Summary Checklist

- [ ] Settings page accessible to all users
- [ ] Profile shows correct user info
- [ ] Profile name can be updated
- [ ] Theme preference can be changed and persists
- [ ] Time zone can be selected and persists
- [ ] Date format can be changed and persists
- [ ] Notification toggles work and persist
- [ ] Provider-specific settings appear for providers
- [ ] Biller-specific settings appear for billers
- [ ] Password change validates current password
- [ ] Password change requires matching passwords
- [ ] Password change requires minimum 8 characters
- [ ] Password change works with valid inputs

---

## Phase 2 – Tenant Provisioning (Codeloom HQ / create-tenant)

### Manual Verification Steps

1. **Run migrations and seed (if needed)**:
   ```bash
   cd backend
   pnpm prisma migrate deploy
   pnpm prisma db seed
   ```

2. **Test the create-tenant CLI tool**:
   ```bash
   cd backend
   pnpm create-tenant \
     --org-name "Sunrise Primary Care LLC" \
     --practice-name "Sunrise Primary Care" \
     --admin-email "owner@sunrisepeds.com" \
     --plan-type STARTER \
     --billing-cycle MONTHLY
   ```

   Expected output:
   - Success message with summary of created entities
   - Organization ID, Practice ID, Subscription details
   - Admin user email and ID
   - PracticeUser membership details
   - Usage period initialization
   - Default password reminder

3. **Verify in database** (using Prisma Studio or SQL):
   ```bash
   pnpm prisma studio
   ```
   
   Check:
   - New Organization exists with name "Sunrise Primary Care LLC"
   - New Practice exists with name "Sunrise Primary Care" linked to the org
   - Subscription exists for that org with STARTER plan, MONTHLY billing
   - Admin user exists with email "owner@sunrisepeds.com"
   - PracticeUser row links the admin user to the practice with PRACTICE_ADMIN role
   - UsagePeriod exists for the current month for that practice

4. **Test idempotency**:
   - Run the same `create-tenant` command again with identical parameters
   - Should complete successfully without errors
   - Should log warnings about reusing existing entities
   - Should not create duplicate records

5. **Test with different options**:
   ```bash
   pnpm create-tenant \
     --org-name "Metro Cardiology Group" \
     --admin-email "admin@metrocards.com" \
     --admin-name "Dr. Jane Smith" \
     --plan-type GROWTH \
     --billing-cycle ANNUAL \
     --specialty "cardiology" \
     --time-zone "America/New_York"
   ```

6. **Verify existing seeded tenant still works**:
   - Login with `provider@example.com` / `changeme123`
   - Login with `biller@example.com` / `changeme123`
   - Login with `admin@example.com` / `changeme123`
   - All should work and show "Sample Family Practice" as practice name

7. **Test login with newly created admin** (if login system supports it):
   - Login with `owner@sunrisepeds.com` / `changeme123` (or custom password from env)
   - Should see Admin pages (Team, Billing & Plan, Security & Data)
   - Top bar should show "Sunrise Primary Care" as practice name
   - All admin functionality should be scoped to the new practice

8. **Verify seed script uses same helper**:
   - Check that seed script output shows it's using `createTenant()` helper
   - Verify seed creates same structure as CLI tool

---

## Phase 1 – Domain & Tenancy Cleanup

### Prerequisites

- Database migrations applied
- Seed script run
- Backend and frontend running locally

### Verification Steps

#### 1. Run Migrations and Seed

1. **Apply migrations:**
   ```bash
   cd backend
   pnpm prisma migrate deploy
   ```

2. **Run seed script:**
   ```bash
   pnpm prisma db seed
   ```

3. **Verify seed output:**
   - Should see "Created sample tenant" with organization, practice, subscription, and users
   - Should see "Created platform admin"
   - Should see "✅ Seed completed successfully"

#### 2. Verify Database Structure

1. **Check Organization exists:**
   - In Supabase SQL Editor or database client, run:
     ```sql
     SELECT id, name FROM "Organization" WHERE name = 'Sample Family Practice';
     ```
   - Should return one row

2. **Check Practice is linked to Organization:**
   ```sql
     SELECT p.id, p.name, p."orgId", o.name as org_name
     FROM "Practice" p
     JOIN "Organization" o ON p."orgId" = o.id
     WHERE p.name = 'Sample Family Practice';
     ```
   - Should return practice with linked organization

3. **Check PracticeUser records exist:**
   ```sql
     SELECT pu.id, u.email, pu.role, pu.status, p.name as practice_name
     FROM "PracticeUser" pu
     JOIN "User" u ON pu."userId" = u.id
     JOIN "Practice" p ON pu."practiceId" = p.id
     WHERE p.name = 'Sample Family Practice';
     ```
   - Should return 3 rows (provider, biller, admin)

4. **Check Subscription exists:**
   ```sql
     SELECT s.id, s."planType", s."billingCycle", s.status, o.name as org_name
     FROM "Subscription" s
     JOIN "Organization" o ON s."orgId" = o.id
     WHERE o.name = 'Sample Family Practice';
     ```
   - Should return one subscription with STARTER plan

#### 3. Verify Login and Practice Name Display

1. **Login as Provider:**
   - Go to http://localhost:5173/login
   - Login with `provider@example.com` / `changeme123`
   - After login, check the top bar/sidebar
   - **Verify**: Practice name should display "Sample Family Practice" (from backend, not hardcoded)
   - **Verify**: No hardcoded "Sample Family Practice" string in browser dev tools

2. **Login as Biller:**
   - Logout and login with `biller@example.com` / `changeme123`
   - **Verify**: Practice name displays correctly
   - **Verify**: Can access Encounters page

3. **Login as Admin:**
   - Logout and login with `admin@example.com` / `changeme123`
   - **Verify**: Practice name displays correctly
   - **Verify**: Can access Admin pages
   - **Verify**: Admin pages show data scoped to the practice

#### 4. Verify Backend Helpers

1. **Test /api/me endpoint:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/me
   ```
   - Should return user data with `practiceName` field
   - `practiceName` should be "Sample Family Practice"

2. **Verify helpers are used:**
   - Check backend logs when accessing `/api/me`
   - Should not see errors about missing practice/organization

#### 5. Verify No Hardcoded Practice Names

1. **Search frontend code:**
   ```bash
   cd frontend
   grep -r "Sample Family Practice" src/ --exclude-dir=node_modules
   ```
   - Should return NO results (except possibly in comments)

2. **Search backend code (excluding seed):**
   ```bash
   cd backend
   grep -r "Sample Family Practice" src/ --exclude-dir=node_modules
   ```
   - Should return NO results (seed script is allowed to have it)

#### 6. Verify Seed Script Idempotency

1. **Run seed script twice:**
   ```bash
   pnpm prisma db seed
   pnpm prisma db seed
   ```
   - Second run should not create duplicates
   - Should see "reusing existing" or similar messages
   - Database should have same number of records

### Summary Checklist

- [ ] Migrations applied successfully
- [ ] Seed script runs without errors
- [ ] Organization and Practice created with proper relationship
- [ ] PracticeUser records created for all users
- [ ] Subscription created for organization
- [ ] Login works for provider, biller, and admin
- [ ] Practice name displays in UI (from backend, not hardcoded)
- [ ] No hardcoded "Sample Family Practice" in frontend code
- [ ] `/api/me` returns practiceName
- [ ] Backend helpers work correctly
- [ ] Seed script is idempotent

