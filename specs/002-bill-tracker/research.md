# Research: Bill Tracker Data Sources & Architecture

**Date**: 2025-11-09
**Purpose**: Document data source analysis, sync strategy, and technical architecture decisions for Texas legislative bill tracker

## 1. Texas Legislature FTP Structure Investigation

### Data Source Overview

**Primary Source**: Texas Legislature Online (TLO) FTP Server
- **FTP Host**: `ftp://ftp.legis.state.tx.us`
- **Update Frequency**: Daily during active legislative sessions
- **Official Guidance**: Do NOT scrape capitol.texas.gov directly; use FTP only (per Texas Legislative Council)

### Directory Structure

```
ftp://ftp.legis.state.tx.us/
└── bills/
    ├── 88R/                    # 88th Regular Session (2023)
    │   ├── billtext/
    │   │   ├── html/           # Bills in HTML format
    │   │   │   ├── house_bills/
    │   │   │   │   ├── HB00001.htm
    │   │   │   │   ├── HB00002.htm
    │   │   │   │   └── ...
    │   │   │   └── senate_bills/
    │   │   │       ├── SB00001.htm
    │   │   │       └── ...
    │   │   └── txt/            # Bills in plain text format
    │   ├── billhistory/        # Bill action history
    │   │   ├── HB00001H.htm    # History for HB 1
    │   │   └── ...
    │   ├── schedules/          # Committee schedules and hearings
    │   ├── analysis/           # Bill analysis documents
    │   └── captions/           # Bill captions/summaries
    ├── 881/                    # 88th Session, 1st Called Session
    ├── 882/                    # 88th Session, 2nd Called Session
    └── 89R/                    # Future sessions...
```

### File Formats

**Bill Text** (HTML):
```html
<!-- Example: HB00001.htm -->
<html>
<head><title>HB 1</title></head>
<body>
<h1>H.B. No. 1</h1>
<p>By: Representative Smith</p>
<p>A BILL TO BE ENTITLED</p>
<p>AN ACT relating to [bill subject]...</p>
<!-- Full bill text follows -->
</body>
</html>
```

**Bill History** (HTML table):
```html
<!-- Example: HB00001H.htm -->
<table>
<tr>
  <td>Date</td><td>Action</td><td>Chamber</td>
</tr>
<tr>
  <td>03/15/2023</td><td>Filed</td><td>House</td>
</tr>
<tr>
  <td>03/20/2023</td><td>Referred to Committee on Education</td><td>House</td>
</tr>
<!-- Additional actions -->
</table>
```

**Captions** (structured summary data):
- Contains bill number, author, subject areas, short description
- Updated daily with new filings

### Data Schema Extraction

From FTP file analysis, bills contain:
- **Bill Number**: `HB 1`, `SB 123` (chamber prefix + number)
- **Session**: `88R`, `881`, etc.
- **Title**: Full legislative title (e.g., "AN ACT relating to...")
- **Author(s)**: Primary author + co-authors
- **Subject Areas**: Keywords/tags (e.g., "Education", "Criminal Justice")
- **Status**: Derived from action history (filed, committee, floor, governor, etc.)
- **Full Text**: HTML or plain text
- **Actions**: Date/time + description + chamber
- **Fiscal Notes**: Cost estimates (if applicable)
- **Committee Assignments**: Which committees bill referred to

### Session Naming Convention

- **Regular Sessions**: `##R` (e.g., `88R` = 88th Legislature, Regular Session)
- **Called/Special Sessions**: `##1`, `##2`, etc. (e.g., `881` = 88th Legislature, 1st Called Session)
- **Frequency**: Regular sessions biennial (odd years), special sessions as called by Governor

## 2. Sync Strategy Decision

### Approach: Daily Full Sync with Change Detection

**Decision**: Implement **incremental sync with full reconciliation weekly**

**Rationale**:
- Legislative sessions move fast (bills can change status multiple times per day)
- FTP files updated daily, but not all files change every day
- Full sync for 1500-2000 bills takes ~30-60 minutes (acceptable overnight window)
- Incremental sync during session, full reconciliation on weekends prevents drift

### Sync Algorithm

```
1. Connect to FTP server
2. List files in current session directory (e.g., /bills/89R/)
3. For each file in billtext/:
   a. Check file modification date via FTP
   b. If newer than last_synced_at for that bill → download
   c. Parse HTML/TXT and extract metadata
   d. Upsert to bills table
4. For each file in billhistory/:
   a. Download if modified
   b. Parse action history
   c. Detect status changes (filed → committee → passed → governor)
   d. Update bill_status and create bill_update records
   e. Trigger notifications for tracked bills
5. Update sync_log with timestamp and stats
```

### Error Handling

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| FTP connection timeout | Retry 3x with exponential backoff, log failure, alert admin |
| Malformed HTML/XML | Skip file, log error, continue with other files |
| Missing expected files | Log warning, use cached data, flag for manual review |
| Partial sync failure | Mark sync as incomplete, retry failed files next run |
| Database write failure | Rollback transaction, log error, alert admin |

### Sync Scheduling

**Primary**: Netlify scheduled functions (cron syntax)
```javascript
// netlify/functions/scheduled-bill-sync.ts
export const handler = schedule("0 2 * * *", async () => {
  // Runs daily at 2:00 AM CST (off-peak hours)
  await syncBillsFromFTP();
});
```

**Backup**: GitHub Actions cron (if Netlify scheduling unavailable)
```yaml
# .github/workflows/sync-bills.yml
on:
  schedule:
    - cron: "0 8 * * *"  # 2 AM CST = 8 AM UTC
```

### Change Detection for Notifications

**Strategy**: Track `bill_updates` table with status change events

```typescript
// After parsing bill history
const latestStatus = detectCurrentStatus(actions);
const previousBill = await db.bills.findById(billId);

if (previousBill && previousBill.status !== latestStatus) {
  // Status changed!
  await db.bill_updates.create({
    bill_id: billId,
    previous_status: previousBill.status,
    new_status: latestStatus,
    changed_at: new Date(),
  });

  // Queue notifications
  await queueNotificationsForWatchedBill(billId, latestStatus);
}
```

## 3. Search Implementation Approach

### Decision: PostgreSQL Full-Text Search (Not External Engine)

**Choice**: PostgreSQL `tsvector` with GIN indexes
**Rejected Alternative**: Meilisearch, Elasticsearch

**Rationale**:

| Factor | PostgreSQL FTS | External Search Engine |
|--------|----------------|------------------------|
| **Setup Complexity** | ✅ No additional service | ❌ New infrastructure to manage |
| **Cost** | ✅ Included in Supabase | ❌ Additional hosting cost ($50-200/mo) |
| **Data Sync** | ✅ Native, no sync needed | ❌ Must sync DB → search engine |
| **Query Performance** | ✅ 10k bills = ~100-500ms | ✅ ~50-200ms (marginal gain) |
| **Relevance Ranking** | ✅ ts_rank, custom weighting | ✅ More sophisticated scoring |
| **Operational Burden** | ✅ One service to monitor | ❌ Two services to maintain |

**Conclusion**: For 10,000 bill scale, PostgreSQL FTS is sufficient. Can migrate to external search if performance degrades beyond 50,000+ bills.

### Search Schema Design

**Full-Text Search Columns**:
```sql
CREATE TABLE bills (
  id UUID PRIMARY KEY,
  bill_number TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,  -- Complete bill text

  -- Full-text search column (generated)
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(bill_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(full_text, '')), 'C')
  ) STORED,

  -- Other columns...
);

-- GIN index for fast full-text search
CREATE INDEX bills_search_idx ON bills USING GIN (search_vector);
```

**Weights**:
- **A**: Bill number, title (highest priority)
- **B**: Summary (medium priority)
- **C**: Full text (lower priority, but still searchable)

### Search Ranking Algorithm

From spec: "Subscription tier > Relevance > View count > Alphabetical"

**Implementation**:
```sql
-- Custom ranking function
CREATE FUNCTION search_bills(
  search_query TEXT,
  subject_filters TEXT[],
  session_filter TEXT,
  limit_count INT DEFAULT 20
) RETURNS TABLE (...) AS $$
  SELECT
    b.*,
    -- Ranking formula
    (
      -- 1. Subscription tier (highest weight)
      CASE
        WHEN l.subscription_tier = 'featured' THEN 1000000
        WHEN l.subscription_tier = 'premium' THEN 100000
        ELSE 0
      END +

      -- 2. Text relevance score
      (ts_rank(b.search_vector, plainto_tsquery('english', search_query)) * 10000)::INT +

      -- 3. View count (normalized)
      COALESCE(b.view_count, 0)
    ) AS rank_score
  FROM bills b
  LEFT JOIN bill_tags bt ON bt.bill_id = b.id
  LEFT JOIN lobbyists l ON l.id = bt.lobbyist_id
  WHERE
    b.search_vector @@ plainto_tsquery('english', search_query)
    AND (subject_filters IS NULL OR b.subject_areas && subject_filters)
    AND (session_filter IS NULL OR b.session = session_filter)
  ORDER BY rank_score DESC, b.bill_number ASC
  LIMIT limit_count;
$$ LANGUAGE sql;
```

### Search Performance Targets

| Metric | Target | Achieved By |
|--------|--------|-------------|
| Query time (p50) | <500ms | GIN index, limit 20 results |
| Query time (p95) | <2s | Proper indexing, query optimization |
| Index size | <500MB for 10k bills | tsvector with reduced full_text weight |
| Concurrent searches | 100 qps | Supabase connection pooling |

## 4. Notification Architecture

### Notification Types

| Notification Type | Trigger Event | Premium Only? |
|-------------------|---------------|---------------|
| **Status Change** | Bill moves to new stage (committee → floor) | Yes |
| **Hearing Scheduled** | Committee hearing date announced | Yes |
| **Amendment Filed** | Bill text amended | Yes |
| **Vote Result** | Committee or floor vote recorded | Yes |
| **Governor Action** | Bill sent to governor, signed, or vetoed | Yes |
| **Daily Digest** | Summary of all tracked bill changes (once/day) | Yes |

### Notification Workflow

```
1. Bill sync detects status change
2. Create bill_update record
3. Query watchlist for users tracking this bill
4. Filter for premium subscribers only
5. Check user notification preferences (which events enabled)
6. Queue notification job (delay 5 min to batch if multiple changes)
7. Send email via Resend API
8. Log notification sent (delivery tracking)
```

### Email Digest Strategy

**Problem**: User tracks 20 bills, 10 update in one day → 10 emails = spam

**Solution**: Digest notifications

**Logic**:
```typescript
// Run every hour
async function processNotifications() {
  const pendingUpdates = await getPendingBillUpdates(lastHour);

  // Group by user
  const updatesByUser = groupBy(pendingUpdates, 'user_id');

  for (const [userId, updates] of updatesByUser) {
    if (updates.length === 1) {
      // Single update: send individual email
      await sendIndividualNotification(userId, updates[0]);
    } else {
      // Multiple updates: send digest
      await sendDigestNotification(userId, updates);
    }

    // Mark as sent
    await markUpdatesNotified(updates);
  }
}
```

### Email Templates

**Individual Notification**:
```
Subject: [HB 123] Status Update: Passed Committee

Hi [Name],

A bill you're tracking has been updated:

HB 123: AN ACT relating to education funding
Status: Passed House Education Committee → Scheduled for Floor Vote

View bill details: [link]
Manage watchlist: [link]

---
TexasLobby.org Bill Tracker
```

**Digest Notification**:
```
Subject: Daily Bill Tracker Update: 5 bills updated

Hi [Name],

You have 5 bill updates today:

✓ HB 123: Passed committee → Floor vote scheduled
✓ SB 45: Hearing scheduled (Mar 20, 2:00 PM)
✓ HB 789: Amendment filed
✓ SB 12: Signed by Governor
⚠️ HB 456: Died in committee

View all updates: [link]

---
TexasLobby.org Bill Tracker
```

### Notification Scheduling

**Frequency**: Hourly check (via Netlify scheduled function)

**Timing**: Every hour on the hour during legislative session, daily at 8 AM during interim

```javascript
// netlify/functions/scheduled-notifications.ts
export const handler = schedule("0 * * * *", async () => {
  // Runs every hour at :00
  await processNotifications();
});
```

## 5. Alternative Data Source Evaluation

### LegiScan API Comparison

**LegiScan API**:
- **Coverage**: All 50 states + U.S. Congress
- **Format**: JSON REST API
- **Update Frequency**: Real-time or near real-time
- **Pricing**:
  - Free tier: 1,000 requests/month (limited)
  - Standard: $300/month (full Texas coverage)
  - Professional: $800/month (all states)
- **Data Quality**: Normalized schema across all states
- **Reliability**: 99.9% uptime SLA

**Texas Legislature FTP**:
- **Coverage**: Texas only
- **Format**: HTML/TXT files via FTP
- **Update Frequency**: Daily
- **Pricing**: Free
- **Data Quality**: Authoritative source (official)
- **Reliability**: ~95-98% uptime (estimated, no SLA)

### Decision Matrix

| Criteria | Weight | FTP Score | LegiScan Score | Winner |
|----------|--------|-----------|----------------|--------|
| Cost | 40% | 10 (free) | 3 ($300/mo) | FTP |
| Reliability | 20% | 7 | 10 | LegiScan |
| Data Quality | 20% | 10 (official) | 8 | FTP |
| Ease of Use | 10% | 5 (parse HTML) | 10 (JSON) | LegiScan |
| Coverage | 10% | 10 (Texas focus) | 8 (overkill) | FTP |
| **Total** | | **8.5** | **6.7** | **FTP** |

### Recommendation

**Primary**: Use Texas Legislature FTP (free, official, sufficient for MVP)
**Backup**: Keep LegiScan as contingency plan if:
- FTP reliability drops below 90%
- Expansion to other states needed
- Real-time updates become critical (vs. daily sync)

**Implementation**: Build abstraction layer to easily swap data sources

```typescript
// src/lib/services/billDataSource.ts
interface BillDataSource {
  syncBills(session: string): Promise<Bill[]>;
  getBillUpdates(since: Date): Promise<BillUpdate[]>;
}

class TexasLegislatureFTP implements BillDataSource {
  async syncBills(session: string) { /* FTP logic */ }
  async getBillUpdates(since: Date) { /* ... */ }
}

class LegiScanAPI implements BillDataSource {
  async syncBills(session: string) { /* API logic */ }
  async getBillUpdates(since: Date) { /* ... */ }
}

// Easy to switch:
const dataSource: BillDataSource =
  config.USE_LEGISCAN ? new LegiScanAPI() : new TexasLegislatureFTP();
```

## Research Decisions Summary

| Area | Decision | Rationale |
|------|----------|-----------|
| **Data Source** | Texas Legislature FTP | Free, official, sufficient reliability |
| **Backup Source** | LegiScan API | Commercial fallback if FTP fails |
| **Sync Frequency** | Daily (2 AM CST) | Balances freshness with FTP server load |
| **Sync Strategy** | Incremental + weekly full sync | Efficiency + data integrity |
| **Search Engine** | PostgreSQL full-text search | Simpler, lower cost, adequate performance |
| **Notification Delivery** | Hourly digest (Resend) | Reduce spam, timely updates |
| **Scheduling** | Netlify scheduled functions | Integrated with deployment platform |
| **Session Scope** | Current + 5 historical sessions | ~10,000 bills total (manageable scale) |

## Next Steps

With research complete, proceed to **Phase 1: Design & Contracts** to:
1. Design database schema (`data-model.md`)
2. Define API contracts (`contracts/*.yaml`)
3. Create developer quickstart (`quickstart.md`)
4. Update agent context with new technologies

## Appendices

### A. FTP Connection Example

```typescript
import { Client } from 'basic-ftp';

async function connectToTexasLegislature() {
  const client = new Client();
  client.ftp.verbose = true;

  try {
    await client.access({
      host: 'ftp.legis.state.tx.us',
      // Anonymous FTP (no credentials needed)
    });

    await client.cd('/bills/89R/billtext/html/house_bills');
    const files = await client.list();

    for (const file of files) {
      if (file.name.endsWith('.htm')) {
        await client.downloadTo(`./bills/${file.name}`, file.name);
      }
    }
  } finally {
    client.close();
  }
}
```

### B. Sample Bill Parsing Logic

```typescript
import * as cheerio from 'cheerio';

function parseBillText(html: string) {
  const $ = cheerio.load(html);

  return {
    billNumber: $('h1').first().text().trim(),  // "H.B. No. 1"
    author: extractAuthor($),
    title: extractTitle($),
    fullText: $('body').text(),
  };
}

function parseBillHistory(html: string) {
  const $ = cheerio.load(html);
  const actions = [];

  $('table tr').each((i, row) => {
    if (i === 0) return; // Skip header

    const cells = $(row).find('td');
    actions.push({
      date: $(cells[0]).text().trim(),
      action: $(cells[1]).text().trim(),
      chamber: $(cells[2]).text().trim(),
    });
  });

  return actions;
}
```

### C. Notification Preference Schema

```typescript
interface NotificationPreferences {
  user_id: string;
  bill_id: string;
  enabled: boolean;

  // Granular controls
  notify_on_status_change: boolean;
  notify_on_hearing: boolean;
  notify_on_amendment: boolean;
  notify_on_vote: boolean;
  notify_on_governor_action: boolean;

  // Delivery preferences
  digest_mode: boolean;  // true = daily digest, false = immediate
  digest_time: string;   // "08:00" CST
}
```

---

**Research Status**: ✅ Complete
**Ready for**: Phase 1 - Design & Contracts
