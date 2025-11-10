# GitHub Actions Automation Setup

This document explains how to configure automated bill syncing and notifications for the TexasLobby.org bill tracker.

## Overview

**3 Automated Workflows**:

1. **Daily Bill Sync** - Runs every day at 2 AM CST
2. **Weekly Full Reconciliation** - Runs every Sunday at 3 AM CST
3. **Hourly Notifications** - Runs every hour during legislative sessions

All workflows run automatically via GitHub Actions (free, unlimited execution time).

---

## Required GitHub Secrets

Navigate to your repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 4 secrets:

### 1. `SUPABASE_URL`
- **Value**: Your Supabase project URL
- **Example**: `https://abcdefghijklmnop.supabase.co`
- **Where to find**: Supabase Dashboard → Project Settings → API

### 2. `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: Your Supabase service role key (private, not anon key!)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find**: Supabase Dashboard → Project Settings → API → `service_role` key
- ⚠️ **CRITICAL**: Use service role (bypasses RLS), NOT anon key

### 3. `SUPABASE_ANON_KEY`
- **Value**: Your Supabase anonymous (public) key
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to find**: Supabase Dashboard → Project Settings → API → `anon` key

### 4. `RESEND_API_KEY`
- **Value**: Your Resend API key for sending emails
- **Example**: `re_123456789abcdefghijklmnop`
- **Where to find**: Resend Dashboard → API Keys
- **Note**: Only needed for notification workflow

---

## Workflows Explained

### 1. Daily Bill Sync (`.github/workflows/sync-bills.yml`)

**Schedule**: Every day at 2 AM CST (8 AM UTC)

**What it does**:
- Connects to Texas Legislature FTP (`ftp://ftp.legis.state.tx.us`)
- Downloads bills modified since last sync
- Parses bill text, metadata, and history
- Updates `bills`, `bill_updates` tables
- Detects status changes for notifications
- Runs for ~30-60 minutes (full session)

**Manual trigger**:
1. Go to **Actions** tab in GitHub
2. Select "Sync Texas Legislative Bills"
3. Click "Run workflow"
4. Optional: Specify session code (e.g., "89R") or enable dry run

**Dry run mode**: Preview changes without writing to database
```bash
# In GitHub Actions UI, check "Dry run" checkbox
```

**Monitoring**:
- View runs in GitHub **Actions** tab
- On failure: Automatic GitHub issue created
- Check run logs for detailed output

---

### 2. Weekly Full Reconciliation (`.github/workflows/full-sync-weekly.yml`)

**Schedule**: Every Sunday at 3 AM CST (9 AM UTC)

**What it does**:
- Full re-sync of entire legislative session
- Validates data integrity
- Catches any bills missed by daily sync
- Reconciles companion bills
- Runs for ~60-90 minutes

**Why needed**:
- Daily sync is incremental (only new/modified)
- Weekly full sync ensures no data drift
- Backup in case daily sync fails

**Manual trigger**:
1. Go to **Actions** tab
2. Select "Full Bill Sync (Weekly Reconciliation)"
3. Click "Run workflow"

---

### 3. Hourly Notifications (`.github/workflows/send-notifications.yml`)

**Schedule**: Every hour on the hour

**What it does**:
- Queries `bill_updates` for pending notifications
- Groups updates by user (digest mode)
- Sends email via Resend API
- Logs to `notifications` table
- Respects user notification preferences
- Only sends to premium/featured subscribers

**What triggers notifications**:
- Bill status changes (filed → committee → passed, etc.)
- Amendments filed
- Committee hearings scheduled
- Vote results
- Governor actions (signed/vetoed)

**Digest logic**:
- Single update → Individual email
- Multiple updates for same user → Digest email
- User preferences honored (immediate vs daily digest)

**Manual trigger**:
1. Go to **Actions** tab
2. Select "Send Bill Update Notifications"
3. Click "Run workflow"

---

## Testing the Automation

### Before First Run

1. **Verify database migration applied**:
   ```bash
   # Check if bill tracker tables exist
   npm run db:push
   ```

2. **Test FTP connection locally**:
   ```bash
   npx tsx scripts/test-ftp-connection.ts
   ```

3. **Run dry-run sync locally**:
   ```bash
   npx tsx scripts/sync-bills.ts --session 89R --dry-run --verbose
   ```

### After Secrets Configured

1. **Manually trigger daily sync**:
   - Go to Actions → "Sync Texas Legislative Bills"
   - Click "Run workflow"
   - Watch logs in real-time

2. **Verify sync succeeded**:
   ```sql
   -- In Supabase SQL Editor
   SELECT COUNT(*) FROM bills;
   SELECT MAX(last_synced_at) FROM bills;
   ```

3. **Test notifications (if users have watchlists)**:
   - Go to Actions → "Send Bill Update Notifications"
   - Click "Run workflow"
   - Check `notifications` table for sent emails

---

## Monitoring & Alerts

### Success Indicators

**Daily Sync**:
- ✅ Green checkmark in Actions tab
- ✅ Bills table `last_synced_at` updated today
- ✅ No GitHub issues auto-created

**Notifications**:
- ✅ Green checkmark in Actions tab
- ✅ Notifications table shows sent emails
- ✅ Resend dashboard shows deliveries

### Failure Alerts

**Automatic alerts on failure**:
- 🚨 GitHub issue created with label "automation"
- 📧 Email notification (if configured in repo settings)
- ❌ Red X in Actions tab

**What to check**:
1. Workflow run logs (click failed run → view logs)
2. Check if FTP server is accessible
3. Verify GitHub secrets are correct
4. Check Supabase database status

---

## Disabling/Pausing Automation

### Pause During Off-Season

When legislature is not in session (June-December odd years):

1. **Reduce sync frequency**:
   ```yaml
   # Edit .github/workflows/sync-bills.yml
   schedule:
     - cron: "0 8 * * 0"  # Weekly instead of daily
   ```

2. **Disable notifications**:
   ```yaml
   # Comment out schedule in .github/workflows/send-notifications.yml
   # schedule:
   #   - cron: "0 * * * *"
   ```

3. **Or disable entire workflow**:
   - GitHub → Settings → Actions → Select workflow
   - Click "Disable workflow"

### Re-enable for New Session

1. **Update session code** in workflows:
   ```yaml
   # Change default from 89R to 90R (next session)
   npx tsx scripts/sync-bills.ts --session 90R
   ```

2. **Re-enable workflows** if disabled

3. **Manually trigger full sync** for new session

---

## Cost

**GitHub Actions**: FREE
- 2,000 minutes/month on free tier
- Workflows use ~2-3 hours/day
- Well within limits

**Alternative if limits exceeded**:
- GitHub Pro: 3,000 minutes/month ($4/month)
- Or reduce sync frequency

---

## Troubleshooting

### Sync fails with "Operation not permitted"

**Cause**: GitHub secrets not configured

**Fix**: Add all 4 secrets (see Required GitHub Secrets above)

---

### Sync fails with "FTP connection timeout"

**Cause**: Texas Legislature FTP server temporarily down

**Fix**: Wait 1 hour, workflow will retry automatically tomorrow

---

### Notifications not sending

**Cause**: Missing `RESEND_API_KEY` or no users have watchlists

**Fix**:
1. Add Resend API key to secrets
2. Verify users have bills in watchlist with `notifications_enabled = true`
3. Check Resend dashboard for delivery errors

---

### Sync completes but no bills in database

**Cause**: Dry run mode enabled or database migration not applied

**Fix**:
1. Verify dry run is disabled (check workflow inputs)
2. Run `npm run db:push` to apply migration
3. Manually trigger sync again

---

## Advanced Configuration

### Custom Sync Schedule

Edit `.github/workflows/sync-bills.yml`:

```yaml
schedule:
  - cron: "0 8 * * *"  # Daily at 2 AM CST
  # OR
  - cron: "0 8,20 * * *"  # Twice daily: 2 AM and 2 PM CST
  # OR
  - cron: "0 8 * * 1-5"  # Weekdays only
```

**Cron syntax**: `minute hour day month weekday`

### Sync Multiple Sessions

To track both regular and special sessions:

```yaml
- name: Sync regular session
  run: npx tsx scripts/sync-bills.ts --session 89R

- name: Sync special session
  run: npx tsx scripts/sync-bills.ts --session 891
```

### Add Slack/Discord Notifications

Replace GitHub issue creation with webhook:

```yaml
- name: Notify on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK_URL }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"🚨 Bill sync failed!"}'
```

---

## Manual Sync Commands

For testing or one-off syncs:

```bash
# Sync specific session
npx tsx scripts/sync-bills.ts --session 89R

# Dry run (preview only)
npx tsx scripts/sync-bills.ts --session 89R --dry-run

# Sync single bill
npx tsx scripts/sync-bills.ts --session 89R --bill HB1

# Verbose logging
npx tsx scripts/sync-bills.ts --session 89R --verbose

# Send notifications manually
npx tsx scripts/send-bill-notifications.ts
```

---

## Summary

✅ **3 workflows created**:
- Daily bill sync (2 AM)
- Weekly full reconciliation (Sundays 3 AM)
- Hourly notifications

✅ **Setup required**:
- Add 4 GitHub secrets
- Verify database migration applied
- Manually trigger first sync

✅ **Monitoring**:
- GitHub Actions tab shows status
- Auto-creates issues on failure
- Check Supabase tables for data

✅ **Zero cost**: GitHub Actions free tier is sufficient

---

**Next steps**:
1. Add GitHub secrets (Settings → Secrets → Actions)
2. Manually trigger first sync (Actions → Run workflow)
3. Verify bills appear in database
4. Monitor daily runs in Actions tab

**Questions?** Check workflow run logs or create an issue.
