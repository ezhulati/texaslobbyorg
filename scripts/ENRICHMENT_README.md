# Data Enrichment Pipeline

This directory contains scripts for enriching Texas lobbyist profiles with data from multiple public and commercial sources. The enrichment pipeline transforms basic TEC registry data into comprehensive, differentiated profiles.

## Overview

**Goal:** Turn basic lobbyist registrations into rich profiles with enforcement history, municipal activity, media presence, corporate client data, and procurement correlations.

**Status:** Phase 2 complete - 5 enrichment scripts operational

**Database Migration:** Run `npm run db:push` to apply `020_add_enrichment_schema.sql` before using scripts

---

## Enrichment Scripts

### 1. TEC Enforcement Actions (`enrich-tec-enforcement.ts`)

**Purpose:** Add credibility and risk signals by tracking TEC enforcement actions.

**Data Sources:**
- [Delinquent Filer List (CSV)](https://www.ethics.state.tx.us/search/delinquent/lobby/)
- [Sworn Complaint Orders (HTML)](https://www.ethics.state.tx.us/enforcement/sworn_complaints/orders/issued/)

**What It Does:**
- Downloads delinquent lobbyist filer data (names, fines, addresses)
- Scrapes sworn complaint orders (order numbers, dates, respondent names)
- Fuzzy matches enforcement targets to lobbyist profiles (85%+ similarity)
- Stores individual enforcement actions in `enforcement_actions` table
- Updates lobbyist summary fields: `enforcement_actions_count`, `has_enforcement_history`, `last_enforcement_year`

**Output:**
- "Clean record" badge for lobbyists with no enforcement history
- Transparency data for those with violations
- Sortable/filterable by enforcement status

**Usage:**
```bash
npx tsx scripts/enrich-tec-enforcement.ts
```

**Requirements:** None (free public data)

---

### 2. Austin City Lobbying (`enrich-austin-lobbying.ts`)

**Purpose:** Capture municipal lobbying activity not shown in state TEC data.

**Data Source:**
- [Austin Open Data Portal (Socrata API)](https://data.austintexas.gov/)
  - Registrants: `/resource/58ix-34ma.json`
  - Clients: `/resource/7ena-g23u.json`

**What It Does:**
- Fetches Austin city lobbyist registrations via Socrata API
- Fetches client relationships for each Austin lobbyist
- Matches registrants to state lobbyist profiles
- Groups clients by lobbyist and year
- Stores municipal registrations in `municipal_registrations` table
- Updates `municipal_activity_cities` array on lobbyist profiles

**Output:**
- "Active in Austin City Council" badge
- Differentiation from state-only lobbyists
- Municipal client roster (may differ from state clients)

**Usage:**
```bash
npx tsx scripts/enrich-austin-lobbying.ts
```

**Requirements:** None (free public API, no token required)

**Future:** Easily extensible to Houston, Dallas, San Antonio city registries

---

### 3. OpenCorporates + GLEIF Entity Normalization (`enrich-opencorporates.ts`)

**Purpose:** Normalize client entity names and enrich with corporate metadata.

**Data Sources:**
- [OpenCorporates API](https://api.opencorporates.com/) (optional, free tier with token)
- [GLEIF LEI API](https://api.gleif.org/) (free, no token required)

**What It Does:**
- Reads all unique client names from `clients` table
- Searches OpenCorporates for company registry data (legal name, jurisdiction, company type, address)
- Searches GLEIF for Legal Entity Identifier (LEI) data
- Updates client records with: `legal_name`, `jurisdiction`, `entity_type`, `status`, `registered_address`, `lei_code`, `opencorporates_url`
- Enables better entity matching and deduplication across sources

**Output:**
- "Acme Health → Healthcare Services (NAICS 621), HQ: Austin, 500-1000 employees"
- Parent company relationships via LEI
- Corporate legitimacy signals

**Usage:**
```bash
# Option 1: GLEIF only (no token)
npx tsx scripts/enrich-opencorporates.ts

# Option 2: Both sources (set API token first)
export OPENCORPORATES_API_TOKEN=your_token_here
npx tsx scripts/enrich-opencorporates.ts
```

**Requirements:**
- **GLEIF:** None (free, no token)
- **OpenCorporates:** Optional API token from [opencorporates.com/api_accounts/new](https://opencorporates.com/api_accounts/new)

---

### 4. GDELT News Mentions (`enrich-gdelt-mentions.ts`)

**Purpose:** Track media presence and news coverage for lobbyists.

**Data Source:**
- [GDELT 2.0 Doc API](https://api.gdeltproject.org/api/v2/doc/doc)

**What It Does:**
- Queries GDELT for news articles mentioning each lobbyist's name (last 6 months)
- Filters to Texas-relevant sources (Texas Tribune, Austin Statesman, Dallas Morning News, etc.)
- Stores article URLs, titles, publication dates in `media_mentions` table
- Updates lobbyist metrics: `media_mentions_count`, `media_mentions_last_30d`, `last_media_mention_date`
- Processes top lobbyists first (by view count) for faster initial value

**Output:**
- "Featured in 12 news articles" badge
- Recent press mentions on profile pages
- Trending lobbyist indicators

**Usage:**
```bash
npx tsx scripts/enrich-gdelt-mentions.ts
```

**Requirements:** None (free public API, no token)

**Configuration:**
- `MAX_LOBBYISTS_TO_PROCESS`: Currently 500 (increase for full enrichment)
- `TIMESPAN`: Currently 6 months (adjustable)

---

### 5. Texas Procurement Data (`enrich-procurement.ts`)

**Purpose:** Build "contracts won while represented" dataset - the ultimate ROI metric.

**Data Source:**
- [Texas Open Data Portal](https://data.texas.gov/)
  - Currently: TCEQ Contracts (`/resource/svjm-sdfz.json`)
  - Future: DIR Cooperative Contracts, LBB Contracts Database, Comptroller data

**What It Does:**
- Fetches state contract awards from Socrata-based datasets
- Normalizes company names for matching (removes Inc, LLC, etc.)
- Matches contract vendors to known lobbyist clients
- Stores contracts in `client_contracts` table with agency, amount, award date
- Generates summary statistics (total value, by agency, by year)

**Output:**
- "Client X won $2.3M in HHSC contracts (2023-2024)"
- Proof of lobbying effectiveness
- Competitive moat (others unlikely to aggregate this)

**Usage:**
```bash
npx tsx scripts/enrich-procurement.ts
```

**Requirements:** None (free public API)

**Future Enhancement:** Add attribution logic to link contracts to specific lobbyist representation periods (requires business rules from domain expert)

---

## Database Schema

All enrichment data is stored in new tables created by migration `020_add_enrichment_schema.sql`:

### New Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `enforcement_actions` | TEC violations & fines | `action_type`, `fine_amount`, `year`, `order_number` |
| `municipal_registrations` | City lobbying activity | `city`, `clients[]`, `year`, `status` |
| `media_mentions` | News article mentions | `article_url`, `published_date`, `source_domain` |
| `client_contracts` | State contract awards | `client_name`, `amount`, `agency`, `award_date` |

### Enhanced Fields

**Lobbyists Table:**
```sql
enforcement_actions_count      INTEGER      -- Total TEC enforcement actions
has_enforcement_history        BOOLEAN      -- Quick filter for clean records
last_enforcement_year          INTEGER      -- Most recent enforcement year
municipal_activity_cities      TEXT[]       -- Cities where registered (e.g., ['Austin', 'Houston'])
media_mentions_count           INTEGER      -- Total GDELT mentions
media_mentions_last_30d        INTEGER      -- Recent media activity
last_media_mention_date        TIMESTAMPTZ  -- Last press mention
```

**Clients Table:**
```sql
legal_name                     TEXT         -- Official name from OpenCorporates/GLEIF
jurisdiction                   TEXT         -- Legal jurisdiction (e.g., 'us_tx')
entity_type                    TEXT         -- Company type
status                         TEXT         -- Active/dissolved
registered_address             TEXT         -- Official address
lei_code                       TEXT         -- Legal Entity Identifier
opencorporates_url             TEXT         -- Profile link
```

---

## Setup & Installation

### 1. Apply Database Migration

```bash
npm run db:push
```

This runs all migrations including `020_add_enrichment_schema.sql`.

### 2. Install Dependencies

Already included in `package.json`:
- `cheerio` - HTML parsing for TEC enforcement scraping
- `@supabase/supabase-js` - Database client

### 3. Configure Environment Variables

**Required (already in `.env`):**
```bash
PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Optional:**
```bash
OPENCORPORATES_API_TOKEN=your_token  # For OpenCorporates enrichment
```

### 4. Run Enrichment Scripts

Run in sequence or individually:

```bash
# Full enrichment pipeline (run in order)
npx tsx scripts/enrich-tec-enforcement.ts
npx tsx scripts/enrich-austin-lobbying.ts
npx tsx scripts/enrich-opencorporates.ts
npx tsx scripts/enrich-gdelt-mentions.ts
npx tsx scripts/enrich-procurement.ts
```

**Estimated Runtime:** ~2-4 hours for full enrichment of 1,687 lobbyists (depending on rate limits)

---

## Enrichment Workflow

### Initial Enrichment (One-Time)

1. ✅ Run migration: `npm run db:push`
2. ✅ TEC enforcement (fastest, ~10 minutes)
3. ✅ Austin lobbying (fast, ~5 minutes)
4. ✅ Procurement data (medium, ~30 minutes)
5. ✅ GDELT mentions (slow, ~2-3 hours for top 500 lobbyists)
6. ✅ OpenCorporates (very slow if using API, ~3-4 hours)

### Incremental Updates (Monthly/Quarterly)

- **TEC enforcement:** Monthly (new violations)
- **Austin lobbying:** Quarterly (registrations update slowly)
- **Procurement:** Monthly (new contract awards)
- **GDELT mentions:** Weekly (monitor recent news)
- **OpenCorporates:** Only for new clients

---

## Architecture Patterns

### Fuzzy Name Matching

All scripts use Levenshtein distance for name matching:
```typescript
function similarityScore(str1: string, str2: string): number {
  // Returns 0-1 score
  // 0.85+ required for match (85% similarity)
}
```

**Why:** Handles variations like "John Smith" vs "John A. Smith" or "Acme Inc." vs "Acme Incorporated"

### Rate Limiting

All scripts implement respectful rate limiting:
- TEC scraping: 1 second between requests
- Austin API: 500ms between requests
- GLEIF: 2 seconds (no official limit, being cautious)
- GDELT: 1 second (no official limit, being respectful)

### Batch Processing

Database inserts use batch sizes of 50 records to optimize performance while avoiding timeouts.

### Error Handling

- **Retry logic:** 3 retries for API failures
- **Continue on error:** Single failures don't stop entire enrichment
- **Logging:** Console output shows progress and match rates

---

## Data Quality & Accuracy

### Match Rates (Expected)

| Script | Expected Match Rate | Notes |
|--------|---------------------|-------|
| TEC Enforcement | 60-70% | Some names may be individuals not in registry |
| Austin Lobbying | 20-30% | Only ~200-400 of 1,687 lobbyists are Austin-active |
| OpenCorporates | 30-50% | Many clients are small businesses not in registry |
| GDELT Mentions | 10-20% | Only high-profile lobbyists get press coverage |
| Procurement | 15-25% | Matches depend on client name normalization |

### Data Freshness

| Source | Update Frequency | Script Re-Run Frequency |
|--------|------------------|-------------------------|
| TEC Enforcement | Daily | Monthly |
| Austin Lobbying | Monthly | Quarterly |
| OpenCorporates | Real-time | On new clients only |
| GDELT | Real-time | Weekly (recent) or Monthly (full) |
| Procurement | Daily | Monthly |

---

## Future Enhancements

### Phase 3 (Not Yet Implemented)

1. **Shared Utilities** - Extract common code:
   - `src/lib/enrichment/entity-matcher.ts` - Fuzzy matching
   - `src/lib/enrichment/rate-limiter.ts` - API throttling
   - `src/lib/enrichment/logger.ts` - Structured logging

2. **Additional Data Sources:**
   - Houston, Dallas, San Antonio city lobbying registries
   - Federal lobbying data (LDA filings)
   - State Bar of Texas attorney verification
   - Campaign finance data (TEC + FEC)
   - Government agency calendars (PUC, TCEQ, GLO meeting attendees)

3. **Procurement Correlation Logic:**
   - "Contracts won within 12 months of representation"
   - Attribution rules for multi-year contracts
   - ROI calculation: contract value vs. lobbying fees

4. **Automated Scheduling:**
   - Cron jobs for weekly/monthly re-enrichment
   - Incremental updates (only new/changed data)
   - Email notifications on completion/errors

---

## Troubleshooting

### Common Issues

**Script fails with "Missing Supabase credentials":**
```bash
# Ensure .env file exists and contains:
PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**OpenCorporates returns no matches:**
```bash
# You likely don't have an API token set
export OPENCORPORATES_API_TOKEN=your_token
# Or: just run without token, only GLEIF will be used
```

**GDELT returns 0 results:**
- Check internet connection
- GDELT API may be temporarily down
- Try reducing `MAX_LOBBYISTS_TO_PROCESS` to test with smaller dataset

**Database insert errors:**
```bash
# Ensure migration was applied
npm run db:push

# Check that tables exist
psql $DATABASE_URL -c "\dt"
```

---

## Performance Optimization

### Current Implementation

- **Sequential processing:** One lobbyist at a time (rate limit compliance)
- **No caching:** Fresh data on every run
- **Full scans:** Processes all lobbyists/clients each run

### Future Optimizations

1. **Incremental processing:** Track last enrichment date, only update changed records
2. **Parallel requests:** Run independent API calls concurrently
3. **Caching layer:** Store API responses for repeated queries
4. **Batch APIs:** Use bulk endpoints where available

---

## API Costs

| Source | Cost | Limits | Notes |
|--------|------|--------|-------|
| TEC Enforcement | Free | None | Public HTML/CSV |
| Austin Lobbying | Free | None | Socrata public API |
| GLEIF | Free | None | Public LEI data |
| GDELT | Free | None | No official rate limit |
| OpenCorporates | Free (basic) | 500 requests/month | Paid tiers available |
| Procurement (Texas.gov) | Free | None | Socrata public API |

**Total Cost for Current Implementation:** $0/month

---

## Security & Compliance

### Data Privacy

- All scripts use **public data only**
- No PII beyond what's in public registries
- Follows each platform's Terms of Service
- Respectful rate limiting

### Database Security

- **RLS enabled** on all enrichment tables
- Public read access (data is public anyway)
- Service role write access (scripts only)
- No sensitive data stored

---

## Monitoring & Logs

### Current Logging

Console output shows:
- Records processed
- Match rates
- Errors (continues on failure)
- Summary statistics

### Future Logging

- Structured JSON logs
- Error tracking (Sentry integration)
- Success/failure metrics
- Performance timing

---

## Support

**Issues:** Create an issue in the repository with:
- Script name
- Error message
- Expected vs. actual behavior

**Questions:** Check `CLAUDE.md` for project architecture context

---

## License

All enrichment scripts are part of TexasLobby.org. Data sources have their own licenses - ensure compliance when using.
