# Quickstart Guide: Bill Tracker

**Purpose**: Get the bill tracker feature running locally for development and testing

**Prerequisites**:
- Node.js 18+ installed
- Access to TexasLobby.org Supabase project
- Environment variables configured (`.env` file)

---

## 1. Database Setup

### Apply Migration

Run the bill tracker database migration to create all necessary tables:

```bash
# From project root
npm run db:push
```

This creates:
- `legislative_sessions` table
- `bills` table (with full-text search)
- `bill_updates` table
- `watchlist_entries` table
- `bill_tags` table
- `notifications` table

### Seed Sample Data

Create a sample legislative session and seed with test bills:

```bash
npx tsx scripts/seed-bills.ts
```

**What this does**:
- Creates a test legislative session (e.g., "89R")
- Inserts 20 sample bills with varied subjects and statuses
- Creates bill updates/history
- Links bills to existing lobbyists via bill_tags

**Sample output**:
```
✓ Created legislative session: 89R (88th Legislature, Regular Session)
✓ Inserted 20 sample bills
✓ Created 45 bill updates (status changes)
✓ Tagged 12 bills with lobbyist expertise
Done! Run `npm run dev` to test bill search.
```

---

## 2. FTP Sync Setup (Optional for Local Development)

For local testing, you can skip FTP sync and use seeded sample data. For production-like testing:

### Test FTP Connection

```bash
# Connect to Texas Legislature FTP and list files
npx tsx scripts/test-ftp-connection.ts
```

**What this does**:
- Connects to `ftp://ftp.legis.state.tx.us`
- Lists available sessions (e.g., `/bills/88R/`, `/bills/89R/`)
- Tests downloading a sample bill file
- Parses HTML and displays extracted metadata

### Run Manual Sync

Sync bills from Texas Legislature FTP (requires active internet connection):

```bash
# Sync current session
npx tsx scripts/sync-bills.ts --session 89R

# Dry run (preview without writing to DB)
npx tsx scripts/sync-bills.ts --session 89R --dry-run

# Sync specific bill
npx tsx scripts/sync-bills.ts --session 89R --bill HB1
```

**Options**:
- `--session` - Session code (e.g., "89R", "881")
- `--dry-run` - Preview changes without writing to database
- `--bill` - Sync single bill by number (e.g., "HB1", "SB123")
- `--verbose` - Show detailed parsing logs

**Expected duration**: 30-60 minutes for full session (~1500 bills)

---

## 3. Running the Application

### Start Development Server

```bash
npm run dev
```

Access bill tracker at:
- **Bill Search**: http://localhost:4321/bills
- **Bill Detail**: http://localhost:4321/bills/89r-hb-1
- **User Watchlist**: http://localhost:4321/bills/watchlist (requires login)

### Test Search Functionality

```bash
# Search bills via API
curl "http://localhost:4321/api/bills/search?q=education"

# Search with filters
curl "http://localhost:4321/api/bills/search?q=healthcare&subjects=Healthcare,Insurance&session=89R"

# Get bill details
curl "http://localhost:4321/api/bills/slug/89r-hb-1"
```

---

## 4. Testing Watchlist Features

### Create Test User Account

1. Visit http://localhost:4321/signup
2. Create account: `test@example.com` / `password123`
3. Verify email (check Supabase Auth logs in local)

### Add Bill to Watchlist (via UI)

1. Navigate to http://localhost:4321/bills
2. Search for a bill (e.g., "education")
3. Click "Add to Watchlist" button
4. View watchlist at http://localhost:4321/bills/watchlist

### Add Bill to Watchlist (via API)

```bash
# Get auth token (replace with your JWT)
TOKEN="your-supabase-jwt-token"

# Add bill to watchlist
curl -X POST http://localhost:4321/api/bills/watchlist \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bill_id": "bill-uuid-here",
    "notifications_enabled": true,
    "notify_on_status_change": true
  }'

# Get watchlist
curl http://localhost:4321/api/bills/watchlist \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Testing Lobbyist Bill Tagging

### Create Lobbyist Profile

Ensure your test account has an associated lobbyist profile:

```sql
-- Run in Supabase SQL Editor
INSERT INTO public.lobbyists (
  user_id,
  first_name,
  last_name,
  email,
  slug,
  subscription_tier,
  is_claimed,
  is_active
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'test@example.com'),
  'John',
  'Doe',
  'test@example.com',
  'john-doe-lobbyist',
  'premium',  -- or 'free', 'featured'
  true,
  true
);
```

### Tag a Bill (via UI)

1. Login as lobbyist account
2. Navigate to bill detail page: http://localhost:4321/bills/89r-hb-1
3. Click "Tag This Bill" button
4. Add analysis/insights (premium/featured only)
5. View your tagged bills at http://localhost:4321/dashboard/my-bills

### Tag a Bill (via API)

```bash
# Tag bill with insights
curl -X POST http://localhost:4321/api/bills/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bill_id": "bill-uuid-here",
    "notes": "This bill impacts small businesses by..."
  }'

# Get tagged bills
curl http://localhost:4321/api/bills/tags \
  -H "Authorization: Bearer $TOKEN"
```

---

## 6. Testing Notifications (Local Development)

### Trigger Notification Manually

```bash
# Simulate bill status change and trigger notifications
npx tsx scripts/test-notifications.ts --bill-id "bill-uuid-here"
```

**What this does**:
- Updates bill status (e.g., "filed" → "committee_passed")
- Creates `bill_update` record
- Finds users watching this bill
- Sends email via Resend API
- Logs notification in `notifications` table

### View Notification Logs

```sql
-- Check sent notifications
SELECT
  n.id,
  u.email,
  b.bill_number,
  n.notification_type,
  n.email_subject,
  n.sent_at,
  n.delivery_status
FROM notifications n
JOIN users u ON u.id = n.user_id
JOIN bills b ON b.id = n.bill_id
ORDER BY n.sent_at DESC
LIMIT 10;
```

### Test Digest Notification

```bash
# Generate and send daily digest for user
npx tsx scripts/send-digest.ts --user-id "user-uuid-here"
```

---

## 7. Testing Full-Text Search

### Test Search Ranking

```bash
# Search for "healthcare" and verify ranking
curl "http://localhost:4321/api/bills/search?q=healthcare" | jq '.bills[] | {bill_number, title, rank_score}'
```

**Expected ranking order**:
1. Bills tagged by featured-tier lobbyists (rank_score > 1,000,000)
2. Bills tagged by premium-tier lobbyists (rank_score > 100,000)
3. Bills with high text relevance (rank_score based on ts_rank)
4. Bills with high view counts
5. Alphabetical (HB1, HB2, ... SB1, SB2)

### Test Search Performance

```bash
# Measure search query time
time curl "http://localhost:4321/api/bills/search?q=education&subjects=Education,Healthcare"
```

**Performance targets**:
- <500ms for p50 (median)
- <2s for p95

---

## 8. Database Queries for Testing

### Check Bill Count

```sql
SELECT COUNT(*) FROM bills;
SELECT COUNT(*) FROM bill_updates;
SELECT COUNT(*) FROM watchlist_entries;
SELECT COUNT(*) FROM bill_tags;
```

### Find Bills by Status

```sql
SELECT bill_number, title, status, status_date
FROM bills
WHERE status = 'committee_passed'
ORDER BY status_date DESC;
```

### Find Most Watched Bills

```sql
SELECT
  b.bill_number,
  b.title,
  COUNT(w.id) AS watchers
FROM bills b
LEFT JOIN watchlist_entries w ON w.bill_id = b.id
GROUP BY b.id
ORDER BY watchers DESC
LIMIT 10;
```

### Find Most Tagged Bills (by lobbyists)

```sql
SELECT
  b.bill_number,
  b.title,
  COUNT(bt.id) AS tag_count
FROM bills b
LEFT JOIN bill_tags bt ON bt.bill_id = b.id
GROUP BY b.id
ORDER BY tag_count DESC
LIMIT 10;
```

---

## 9. Scheduled Jobs (Local Testing)

For local development, Netlify scheduled functions won't run automatically. Test them manually:

### Test Daily Bill Sync

```bash
# Run sync job manually
npx tsx netlify/functions/scheduled-bill-sync.ts
```

### Test Hourly Notification Job

```bash
# Run notification check manually
npx tsx netlify/functions/scheduled-notifications.ts
```

---

## 10. Troubleshooting

### Issue: Bills not appearing in search

**Check**:
1. Run `SELECT COUNT(*) FROM bills;` - should have bills
2. Check `search_vector` is populated: `SELECT search_vector FROM bills LIMIT 1;`
3. Rebuild search index: `UPDATE bills SET updated_at = NOW();`

### Issue: FTP sync failing

**Check**:
1. Internet connection active
2. FTP server accessible: `ping ftp.legis.state.tx.us`
3. Session directory exists: Check `/bills/89R/` exists on FTP
4. Run with `--verbose` flag to see detailed logs

### Issue: Notifications not sending

**Check**:
1. Resend API key configured in `.env`: `RESEND_API_KEY=re_xxx`
2. User has premium subscription: `SELECT subscription_tier FROM users WHERE id = 'user-id';`
3. Notifications enabled in watchlist: `SELECT notifications_enabled FROM watchlist_entries WHERE user_id = 'user-id';`
4. Check notification logs: `SELECT * FROM notifications WHERE user_id = 'user-id' ORDER BY sent_at DESC;`

### Issue: Watchlist limit not enforced

**Check**:
1. Verify tier in users table: `SELECT subscription_tier FROM users WHERE id = 'user-id';`
2. Check watchlist count: `SELECT COUNT(*) FROM watchlist_entries WHERE user_id = 'user-id';`
3. Limit enforcement is application-layer, not database constraint

---

## 11. Sample Data Reference

### Legislative Sessions

| Session Code | Description | Start Date | Active? |
|--------------|-------------|------------|---------|
| 88R | 88th Legislature, Regular | 2023-01-10 | No |
| 881 | 88th Legislature, 1st Called | 2023-06-15 | No |
| 89R | 89th Legislature, Regular | 2025-01-14 | Yes |

### Bill Status Values

| Status | Meaning |
|--------|---------|
| `filed` | Bill introduced |
| `referred` | Referred to committee |
| `hearing_scheduled` | Public hearing scheduled |
| `committee_passed` | Passed committee |
| `committee_failed` | Failed in committee |
| `floor_calendar` | On floor for vote |
| `passed_chamber` | Passed originating chamber |
| `sent_to_other_chamber` | Sent to House/Senate |
| `passed_both_chambers` | Passed both chambers |
| `sent_to_governor` | Awaiting Governor signature |
| `signed` | Signed into law |
| `vetoed` | Vetoed by Governor |
| `dead` | Died/withdrawn |

---

## 12. Next Steps

After local development is working:

1. **Run Tests**: `npm run test` (when tests are written in `/speckit.tasks`)
2. **Deploy to Staging**: Push to `staging` branch, Netlify auto-deploys
3. **Set up Production Cron**: Configure Netlify scheduled functions for prod
4. **Monitor Sync Logs**: Check Netlify function logs for daily sync status
5. **Configure Email Templates**: Customize Resend templates for notifications

---

**Quickstart Status**: ✅ Complete
**Next**: Ready for `/speckit.tasks` to generate implementation tasks
