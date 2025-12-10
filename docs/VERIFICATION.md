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

