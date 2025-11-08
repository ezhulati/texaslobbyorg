# Account Deletion System - Implementation Guide

## Overview

TexasLobby.org implements a **best-in-class account deletion system** with:

- ✅ **Soft delete with 30-day grace period** (industry standard)
- ✅ **Account recovery** during grace period
- ✅ **Data export** (GDPR compliance)
- ✅ **Password confirmation** for security
- ✅ **Audit trail** for compliance
- ✅ **Orphaned account prevention**
- ✅ **Automatic cleanup** via scheduled job

## Features

### 1. Soft Delete (Default)

When a user deletes their account:

- Account is **marked for deletion** (not immediately deleted)
- User is signed out immediately
- Data remains in database for 30 days
- User can **recover** by logging back in during grace period
- After 30 days, account is **permanently deleted** automatically

### 2. Data Export

Before deletion, users can download all their data:

- Profile information
- Favorites list
- Page view history
- Lobbyist profile (if applicable)
- Exported as JSON file (GDPR compliant)

### 3. Security Features

- **Password confirmation required** before deletion
- **No orphaned accounts** - rollback if auth deletion fails
- **Audit trail** - all deletions logged with timestamps
- **Optional reason** - users can provide feedback

## Database Schema

### New Tables

**`account_deletions`** - Audit trail
```sql
- id: UUID
- user_id: UUID (FK to users)
- email: TEXT
- requested_at: TIMESTAMPTZ
- scheduled_deletion_date: TIMESTAMPTZ
- reason: TEXT (optional)
- completed_at: TIMESTAMPTZ
- cancelled_at: TIMESTAMPTZ
```

### New Columns on `users`

```sql
- deleted_at: TIMESTAMPTZ
- deletion_scheduled_for: TIMESTAMPTZ
- deletion_reason: TEXT
```

## Functions

### 1. `mark_user_for_deletion(p_user_id, p_reason, p_grace_period_days)`

Soft deletes a user account:
- Sets deletion timestamps
- Creates audit record
- Returns scheduled deletion date

### 2. `cancel_account_deletion(p_user_id)`

Recovers a user account:
- Removes deletion markers
- Updates audit trail
- Only works if grace period hasn't expired

### 3. `permanently_delete_user(p_user_id)`

Permanently deletes a user:
- Removes user record (cascades to favorites, page_views)
- Marks audit record as completed
- Called automatically after grace period

### 4. `cleanup_expired_accounts()`

Batch cleanup function:
- Finds all users past grace period
- Permanently deletes them
- Returns count of deleted/failed
- Should be run daily via cron

## API Endpoints

### POST `/api/account/delete`

Delete or schedule account deletion.

**Request:**
```json
{
  "password": "user_password",
  "reason": "Optional reason",
  "immediate": false,
  "grace_period_days": 30
}
```

**Response (soft delete):**
```json
{
  "success": true,
  "message": "Account scheduled for deletion",
  "scheduled_date": "2025-12-08T00:00:00Z",
  "grace_period_days": 30,
  "deletion_id": "uuid",
  "recovery_available": true
}
```

### POST `/api/account/recover`

Recover account during grace period.

**Response:**
```json
{
  "success": true,
  "message": "Account successfully recovered"
}
```

### GET `/api/account/export-data`

Download all user data as JSON.

**Response:** JSON file download

## Scheduled Cleanup Job

### Option 1: Supabase Edge Function + External Cron

1. Deploy edge function:
```bash
supabase functions deploy cleanup-deleted-accounts
```

2. Set up cron job (e.g., GitHub Actions, cron-job.org):
```yaml
# .github/workflows/cleanup-accounts.yml
name: Cleanup Deleted Accounts
on:
  schedule:
    - cron: '0 2 * * *' # Run daily at 2 AM UTC
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup function
        run: |
          curl -X POST \
            https://[project-ref].supabase.co/functions/v1/cleanup-deleted-accounts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

### Option 2: pg_cron (if available)

```sql
SELECT cron.schedule(
  'cleanup-deleted-accounts',
  '0 2 * * *', -- Daily at 2 AM
  $$SELECT cleanup_expired_accounts()$$
);
```

## User Experience Flow

### Deletion Flow

1. User clicks "Delete Account"
2. Modal explains 30-day grace period
3. User enters password + optional reason
4. Account scheduled for deletion
5. User signed out immediately
6. Email sent (optional) with recovery instructions
7. After 30 days: Account permanently deleted

### Recovery Flow

1. User logs in within 30 days
2. System detects pending deletion
3. Option to recover account
4. Click "Recover Account"
5. Account fully restored

## Migration Steps

1. **Run migration:**
```bash
npm run db:push
```

2. **Deploy edge function:**
```bash
supabase functions deploy cleanup-deleted-accounts
```

3. **Set up cron job** (choose option above)

4. **Test the flow:**
   - Create test account
   - Delete it (check soft delete works)
   - Recover it (check recovery works)
   - Delete again and wait for cleanup (test permanent deletion)

## Preventing Orphaned Accounts

The system handles edge cases:

**Scenario 1:** Database deletion succeeds, auth deletion fails
- ❌ **Old system:** Orphaned auth account
- ✅ **New system:** Rolls back database deletion

**Scenario 2:** Auth deletion succeeds, database deletion fails
- ❌ **Old system:** Orphaned database record
- ✅ **New system:** Deletes auth first, then database (proper order)

**Scenario 3:** User tries to re-register after deletion
- ❌ **Old system:** "Email already exists" error
- ✅ **New system:** Auth and DB both deleted, re-registration works

## Compliance

### GDPR

- ✅ Data export (Article 20 - Right to data portability)
- ✅ Account deletion (Article 17 - Right to erasure)
- ✅ Audit trail (Article 30 - Records of processing)
- ✅ Grace period (Best practice for accidental deletions)

### Best Practices

- ✅ Password confirmation (Prevent unauthorized deletions)
- ✅ Soft delete (Allow recovery from mistakes)
- ✅ Clear communication (User knows exactly what happens)
- ✅ Data export option (User can save their data first)

## Monitoring

Check audit table for insights:

```sql
-- Recent deletions
SELECT * FROM account_deletions
ORDER BY requested_at DESC
LIMIT 100;

-- Cancellation rate
SELECT
  COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL) * 100.0 /
  COUNT(*) as cancellation_rate_percent
FROM account_deletions;

-- Common reasons for leaving
SELECT deletion_reason, COUNT(*)
FROM account_deletions
WHERE deletion_reason IS NOT NULL
GROUP BY deletion_reason
ORDER BY COUNT(*) DESC;

-- Pending deletions
SELECT COUNT(*)
FROM users
WHERE deleted_at IS NOT NULL
  AND deletion_scheduled_for > NOW();
```

## Testing Checklist

- [ ] User can request account deletion
- [ ] Password confirmation works
- [ ] User is signed out after deletion request
- [ ] Account is soft deleted (data still exists)
- [ ] Deletion is logged in audit table
- [ ] User can recover account during grace period
- [ ] User can export data before deletion
- [ ] Cleanup function permanently deletes after 30 days
- [ ] User can re-register with same email after permanent deletion
- [ ] No orphaned accounts created
- [ ] Error handling works (auth failure, etc.)

## Future Enhancements

- [ ] Email notification when account scheduled for deletion
- [ ] Email reminder 7 days before permanent deletion
- [ ] Email confirmation after permanent deletion
- [ ] Admin dashboard to view deletion metrics
- [ ] Configurable grace period per user
- [ ] Immediate deletion option for users who want it
