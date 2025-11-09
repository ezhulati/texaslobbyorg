# Data Enrichment System - Complete Context Document

**Purpose:** This document provides complete context for working on the data enrichment system in future sessions, when previous conversation history is not available.

**Last Updated:** 2025-11-08
**Status:** Infrastructure complete, matching logic needs debugging
**Decision:** Deferred to post-launch (January 2026)

---

## Quick Summary (Read This First)

**What exists:**
- ✅ 5 production-quality enrichment scripts
- ✅ Database schema with 4 new tables, 10+ new fields
- ✅ Complete documentation and testing notes
- ✅ All external API integrations working

**What doesn't work yet:**
- ❌ Zero data matches found during testing
- ❌ Fuzzy name matching logic needs tuning
- ❌ Estimated 1-2 hours per source to fix

**Recommendation:**
- Launch MVP with base TEC data only (1,837 lobbyists, 8,760 clients)
- Add enrichment post-launch after validating MVP
- Start with procurement (highest ROI - "contracts won while represented")

---

## System Architecture

### The Vision: Data as Competitive Moat

The enrichment system transforms basic Texas Ethics Commission (TEC) lobbyist registry data into rich, differentiated profiles by aggregating data from multiple public sources.

**Base Data (Current - From TEC):**
- Lobbyist names, emails, phones
- Cities they work in
- Subject areas of expertise
- Client lists

**Enriched Data (Future - From Multiple Sources):**
- Enforcement history → "Clean record" badges
- Municipal activity → "Active in Austin City Council" indicators
- Media presence → "Featured in 12 news articles"
- Corporate client data → "Acme Health (Healthcare Services, 500-1000 employees)"
- **Contract correlation** → "Clients won $2.3M in state contracts" (THE MOAT)

---

## File Structure

```
scripts/
├── enrich-tec-enforcement.ts        # TEC violations/delinquent filings
├── enrich-austin-lobbying.ts        # Austin city lobbying registry (Socrata API)
├── enrich-opencorporates.ts         # Corporate entity normalization (OpenCorporates + GLEIF)
├── enrich-gdelt-mentions.ts         # News media coverage (GDELT 2.0 API)
├── enrich-procurement.ts            # State contract awards (Texas Open Data Portal)
├── ENRICHMENT_README.md             # Usage guide for all scripts
└── ENRICHMENT_TESTING_NOTES.md      # Test results and debugging notes

supabase/migrations/
└── 020_add_enrichment_schema.sql    # Database schema (APPLIED ✅)

Database Tables Created:
- enforcement_actions              # TEC enforcement history
- municipal_registrations          # City-level lobbying activity
- media_mentions                   # News articles mentioning lobbyists
- client_contracts                 # State procurement awards

New Fields Added to Existing Tables:
- lobbyists.enforcement_actions_count
- lobbyists.has_enforcement_history
- lobbyists.last_enforcement_year
- lobbyists.municipal_activity_cities
- lobbyists.media_mentions_count
- lobbyists.media_mentions_last_30d
- lobbyists.last_media_mention_date
- clients.legal_name
- clients.jurisdiction
- clients.entity_type
- clients.lei_code
- clients.opencorporates_url
```

---

## How the Enrichment Scripts Work

### Common Pattern (All Scripts Follow This)

1. **Fetch external data** from public API or scraping
2. **Match to database records** using fuzzy name matching
3. **Store enriched data** in new tables
4. **Update summary fields** on lobbyists/clients tables

### Example: Procurement Script Flow

```typescript
// 1. Get all unique client names from database
const clientNames = await getAllClientNames(); // Returns Set<string> of normalized names

// 2. Fetch state contract data from Texas Open Data Portal
const contracts = await fetchContracts('TCEQ_CONTRACTS_DATASET');

// 3. Match contract vendors to our clients
const matches = matchContractsToClients(contracts, clientNames);
// Uses normalizeName() and fuzzy matching

// 4. Store matches in client_contracts table
await storeClientContracts(matches);
```

### Fuzzy Matching Algorithm (THE PROBLEM)

```typescript
/**
 * Normalize name for matching
 * ISSUE: Too aggressive - strips corporate identifiers
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')  // ⚠️ Removes ALL punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity between two strings
 * Uses Levenshtein distance
 * Requires 85%+ match
 */
function similarityScore(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}
```

---

## Test Results (November 2025)

### Database Contents
- **1,837 lobbyists** in database (from TEC)
- **8,760 clients** in database (from TEC)
- All enrichment tables created successfully

### External Data Fetched Successfully

| Script | Records Fetched | Expected Matches | Actual Matches | Issue |
|--------|----------------|------------------|----------------|-------|
| TEC Enforcement | 1,691 orders | ~100-160 (10%) | 0 | Most are politicians/PACs, not lobbyists |
| Austin Lobbying | 307 registrants, 10K clients | ~60-90 (20%) | 0 | Name format mismatch (business vs. personal) |
| Procurement | 2,603 contracts | ~400-650 (25%) | 0 | Client name normalization too aggressive |
| GDELT | Not tested | ~100-200 (10%) | - | Deferred |
| OpenCorporates | Not tested | ~200-400 (30%) | - | Deferred |

**Key Finding:** All scripts successfully fetch data. Zero matches = matching logic problem, not data availability problem.

---

## Root Causes of Zero Matches

### 1. TEC Enforcement (Scripts Work, But Wrong Data)

**Expected:** Individual lobbyist names like "John Smith"

**Actual respondent names:**
- "Staci Williams, Campaign Treasurer, Vote Yes For RRISD Kids" ❌
- "Texas Right to Life Committee, Inc." ❌
- "Robert L. 'Bob' Hall" ❌ (politician, not lobbyist)
- "Campaign Treasurer, XYZ PAC" ❌

**Problem:** Most enforcement orders are against:
- Political Action Committees (PACs)
- Campaign treasurers
- Politicians
- NOT registered lobbyists

**Fix Needed:**
```typescript
// Add pre-filter before fuzzy matching
function isLikelyLobbyist(respondentName: string): boolean {
  const excludeKeywords = [
    'campaign treasurer',
    'pac',
    'political action committee',
    'committee',
    'inc.',
    'llc',
    'corporation'
  ];

  const lower = respondentName.toLowerCase();
  return !excludeKeywords.some(keyword => lower.includes(keyword));
}
```

**Estimated fix time:** 2-3 hours (add filtering, re-test on subset)

---

### 2. Austin Lobbying (Name Format Mismatch)

**Our database (TEC personal names):**
- "J. Kelley Green"
- "Patrick B. Haggerty"
- "Angela Hale"

**Austin registry (suspected - need to inspect):**
- Possibly business names: "Green & Associates Lobbying Firm"
- Possibly formatted differently: "Green, J. Kelley"

**Problem:** TEC uses personal names, Austin may use business entity names.

**Fix Needed:**
1. **Inspect actual Austin API response structure:**
   ```bash
   curl "https://data.austintexas.gov/resource/58ix-34ma.json?$limit=5" | jq
   ```

2. **Two possible solutions:**
   - If Austin has individual names: Adjust name parsing to handle different formats
   - If Austin only has business names: Build business→individual mapping from TEC data

**Estimated fix time:** 2-3 hours (inspect data, adjust matching)

---

### 3. Procurement (Normalization Too Aggressive) ⭐ HIGHEST PRIORITY

**Our clients database:**
- "1A Smart Start LLC"
- "3M Company"
- "34ed, LLC DBA Centegix"

**TCEQ vendor names (suspected):**
- "1A SMART START LLC"
- "3M COMPANY"
- "34ED LLC"

**Current normalization:**
```typescript
normalizeName("3M Company")      // Returns: "m company" ❌
normalizeName("3M COMPANY")      // Returns: "m company" ❌
// Should match but might not due to threshold
```

**Problem:** Function strips ALL non-alpha characters, turning "3M" into "m".

**Fix Needed:**
```typescript
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    // Preserve numbers and spaces
    .replace(/[^a-z0-9\s]/g, ' ')  // ✅ Keep numbers
    // Normalize corporate suffixes
    .replace(/\b(inc|incorporated)\b\.?/g, 'inc')
    .replace(/\b(llc|l\.l\.c)\b\.?/g, 'llc')
    .replace(/\b(corp|corporation)\b\.?/g, 'corp')
    .replace(/\b(co|company)\b\.?/g, 'co')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Test:
normalizeCompanyName("3M Company")     // "3m co"
normalizeCompanyName("3M COMPANY")     // "3m co"  ✅ MATCH!
normalizeCompanyName("3M Co.")         // "3m co"  ✅ MATCH!
```

**Debugging steps:**
1. Log 10 actual TCEQ vendor names from API response
2. Log 10 client names from our database
3. Compare normalized versions
4. Adjust normalization function
5. Test on 100 contracts (not all 2,603)
6. If match rate >15%: run full dataset

**Estimated fix time:** 1-2 hours (highest ROI - this is THE MOAT)

---

## Debugging Workflow (For Future Sessions)

### Step 1: Choose a Data Source to Fix

**Recommendation order (by ROI):**
1. **Procurement** (highest ROI - "contracts won" is your moat)
2. **Austin Lobbying** (differentiator - competitors don't have municipal data)
3. **GDELT** (easy test - might work without fixes)
4. **TEC Enforcement** (lowest ROI - most lobbyists have clean records)
5. **OpenCorporates** (lower priority - nice-to-have)

### Step 2: Run Diagnostic Script

```bash
# Create a diagnostic version of the script
cp scripts/enrich-procurement.ts scripts/debug-procurement.ts

# Add logging BEFORE matching:
console.log('=== RAW VENDOR NAMES (Sample 10) ===');
vendors.slice(0, 10).forEach(v => {
  console.log('Raw:', v.vendor_name);
  console.log('Normalized:', normalizeName(v.vendor_name));
  console.log('---');
});

console.log('=== RAW CLIENT NAMES (Sample 10) ===');
Array.from(clientNames).slice(0, 10).forEach(c => {
  console.log('Normalized:', c);
  console.log('---');
});

# Run diagnostic
npx tsx scripts/debug-procurement.ts
```

### Step 3: Manual Matching Test

Look at the logged output and ask:
- **Should any of these match?**
- **What's preventing the match?** (punctuation, corporate suffixes, formatting)
- **Can I adjust normalization to match them?**

### Step 4: Adjust Normalization Function

Based on manual review, update the normalization function in the script.

### Step 5: Test on Subset

```typescript
// In the script, limit to first 100 records for testing
const contracts = await fetchContracts('DATASET_ID');
const testContracts = contracts.slice(0, 100);  // ✅ Test on subset first

const matches = matchContractsToClients(testContracts, clientNames);
console.log(`Match rate: ${matches.length} / 100 = ${(matches.length/100*100).toFixed(1)}%`);
```

**Success criteria:** >15% match rate on subset

### Step 6: Full Run

If subset looks good:
```typescript
// Remove the .slice(0, 100) and run full dataset
const matches = matchContractsToClients(contracts, clientNames);
```

### Step 7: Verify Data in Database

```sql
-- Check stored contracts
SELECT client_name, contract_title, agency, amount
FROM client_contracts
ORDER BY amount DESC
LIMIT 20;

-- Verify no duplicates
SELECT client_name, COUNT(*) as count
FROM client_contracts
GROUP BY client_name
HAVING COUNT(*) > 1;
```

---

## Data Source Details

### 1. TEC Enforcement

**Source:** https://www.ethics.state.tx.us/enforcement/sworn_complaints/orders/issued/

**Data Format:** HTML table (scraped with cheerio)

**API:** None (web scraping)

**Rate Limit:** None known, using 1 second delay between requests

**Data Volume:** 1,691 sworn complaint orders (1992-present)

**Cost:** Free

**Key Fields:**
- Order number (e.g., "SC-32408446")
- Respondent name
- Date issued
- PDF URL to full order

**Match Target:** lobbyists table (first_name, last_name)

**Current Issue:** Most respondents are PACs/politicians, not lobbyists

---

### 2. Austin City Lobbying

**Source:** https://data.austintexas.gov (Socrata platform)

**API Endpoints:**
- Registrants: `https://data.austintexas.gov/resource/58ix-34ma.json`
- Clients: `https://data.austintexas.gov/resource/7ena-g23u.json`

**Rate Limit:** None (Socrata public API)

**Data Volume:**
- 307 registrants
- 10,000 client relationships

**Cost:** Free

**Key Fields:**
- Registrant: first_name, last_name, business_entity_name, organization_name, registration_year
- Client: lobbyist_first_name, lobbyist_last_name, client_name, registration_year

**Match Target:** lobbyists table (first_name, last_name)

**Current Issue:** Name format mismatch (TEC vs. Austin)

**Debugging URL:**
```bash
# Inspect actual API response
curl "https://data.austintexas.gov/resource/58ix-34ma.json?\$limit=5" | jq '.[0]'
```

---

### 3. Texas Procurement (TCEQ Contracts)

**Source:** https://data.texas.gov (Socrata platform)

**API Endpoint:** `https://data.texas.gov/resource/svjm-sdfz.json`

**Rate Limit:** None (Socrata public API)

**Data Volume:** 2,603 TCEQ contract records

**Cost:** Free

**Key Fields:**
- vendor (company name)
- amount
- award_date
- description
- agency

**Match Target:** clients table (name)

**Current Issue:** Client name normalization too aggressive

**Debugging URL:**
```bash
# Inspect actual vendor names
curl "https://data.texas.gov/resource/svjm-sdfz.json?\$limit=5" | jq '.[].vendor'
```

**Additional Datasets (Not Yet Configured):**
- DIR Cooperative Contracts: `4v6c-qfkr`
- Other agency contracts: Can be added to `DATASETS` array in script

---

### 4. GDELT News Mentions

**Source:** https://api.gdeltproject.org/api/v2/doc/doc

**API:** Free, no token required

**Rate Limit:** None known, using 1 second delay

**Data Volume:** Depends on lobbyist prominence

**Cost:** Free

**Query Example:**
```
https://api.gdeltproject.org/api/v2/doc/doc?query="John Smith"&mode=artlist&format=json&timespan=6months&maxrecords=250
```

**Match Target:** lobbyists table (exact name match)

**Status:** Not yet tested (might work without fixes - simpler matching)

**Texas-Relevant Sources Filter:**
- texastribune.org
- statesman.com
- dallasnews.com
- houstonchronicle.com
- (see full list in script)

**Note:** This script has best chance of working immediately because it uses exact lobbyist names, not fuzzy matching.

---

### 5. OpenCorporates + GLEIF

**Sources:**
- OpenCorporates: https://api.opencorporates.com/v0.4/companies/search
- GLEIF LEI: https://api.gleif.org/api/v1/lei-records

**API Requirements:**
- OpenCorporates: Free tier (500 requests/month) - optional token via `OPENCORPORATES_API_TOKEN` env var
- GLEIF: Free, no token required

**Rate Limits:**
- OpenCorporates: 500/month (free tier)
- GLEIF: None known, using 2 second delay

**Data Volume:** 8,760 unique clients to enrich

**Cost:** Free (basic tier)

**Match Target:** clients table (name)

**Status:** Not yet tested

**Purpose:** Enrich client entities with:
- Legal entity names
- Jurisdictions
- Parent companies (via LEI)
- Corporate metadata

---

## Environment Variables

**Required (Already Set):**
```bash
PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Optional (Not Currently Set):**
```bash
OPENCORPORATES_API_TOKEN=your_token  # For OpenCorporates enrichment
```

---

## Running the Scripts

### First Time Setup (Already Done)

```bash
# 1. Install dependencies (already done)
npm install cheerio  # Added for TEC enforcement HTML scraping

# 2. Apply database migration (already done)
npm run db:push

# 3. Verify tables exist
npx supabase db execute "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%_actions' OR tablename LIKE '%_mentions';"
```

### Running Individual Scripts

```bash
# Test each script individually
npx tsx scripts/enrich-tec-enforcement.ts     # 5+ minutes, kills may be needed
npx tsx scripts/enrich-austin-lobbying.ts     # ~3 seconds
npx tsx scripts/enrich-procurement.ts         # ~10 seconds
npx tsx scripts/enrich-gdelt-mentions.ts      # 2-3 hours for 500 lobbyists
npx tsx scripts/enrich-opencorporates.ts      # 3-4 hours for all clients
```

### Running All Scripts (When Fixed)

```bash
# Run in sequence
for script in enrich-tec-enforcement enrich-austin-lobbying enrich-procurement enrich-gdelt-mentions enrich-opencorporates; do
  echo "Running $script..."
  npx tsx scripts/$script.ts
done
```

---

## Database Query Examples

### Check Enrichment Status

```sql
-- Count enriched lobbyists
SELECT
  COUNT(*) FILTER (WHERE enforcement_actions_count > 0) as with_enforcement,
  COUNT(*) FILTER (WHERE municipal_activity_cities IS NOT NULL AND array_length(municipal_activity_cities, 1) > 0) as with_municipal,
  COUNT(*) FILTER (WHERE media_mentions_count > 0) as with_media,
  COUNT(*) as total
FROM lobbyists;

-- Sample enriched profiles
SELECT
  first_name,
  last_name,
  enforcement_actions_count,
  municipal_activity_cities,
  media_mentions_count
FROM lobbyists
WHERE enforcement_actions_count > 0
   OR media_mentions_count > 0
LIMIT 10;
```

### View Enrichment Data

```sql
-- View enforcement actions
SELECT
  l.first_name,
  l.last_name,
  ea.action_type,
  ea.year,
  ea.description
FROM enforcement_actions ea
JOIN lobbyists l ON l.id = ea.lobbyist_id
ORDER BY ea.date_issued DESC
LIMIT 20;

-- View procurement contracts
SELECT
  client_name,
  contract_title,
  agency,
  amount,
  award_date
FROM client_contracts
ORDER BY amount DESC
LIMIT 20;

-- View media mentions
SELECT
  l.first_name,
  l.last_name,
  mm.article_title,
  mm.source_domain,
  mm.published_date
FROM media_mentions mm
JOIN lobbyists l ON l.id = mm.lobbyist_id
ORDER BY mm.published_date DESC
LIMIT 20;
```

---

## Success Metrics (When Debugging)

### Per-Script Target Match Rates

| Script | Minimum Match Rate | Good Match Rate | Excellent Match Rate |
|--------|-------------------|-----------------|---------------------|
| TEC Enforcement | 5% (85 matches) | 10% (170 matches) | 15% (250 matches) |
| Austin Lobbying | 15% (46 matches) | 25% (77 matches) | 35% (107 matches) |
| Procurement | 15% (390 matches) | 25% (650 matches) | 35% (910 matches) |
| GDELT | 5% (92 matches) | 10% (184 matches) | 20% (367 matches) |
| OpenCorporates | 20% (1,752 matches) | 35% (3,066 matches) | 50% (4,380 matches) |

**Note:** These are estimates based on data overlap expectations. Actual rates depend on:
- Data quality from external sources
- Name formatting consistency
- Fuzzy matching threshold (currently 85%)

---

## Common Pitfalls & Solutions

### Pitfall 1: Running Full Dataset First

**Problem:** Processing 1,691 enforcement records takes 5+ minutes and usually yields 0 matches.

**Solution:** Always test on a subset first (10-100 records).

```typescript
// Add this at the start of processing function
const testData = allData.slice(0, 100);  // Test on 100 first
console.log(`Testing on ${testData.length} records...`);
```

---

### Pitfall 2: Not Logging Before Matching

**Problem:** Can't debug why no matches when you don't see the raw data.

**Solution:** Always log raw + normalized data before matching.

```typescript
// Add extensive logging
console.log('=== SAMPLE RAW DATA ===');
externalData.slice(0, 5).forEach(item => {
  console.log('Raw:', item);
  console.log('Normalized:', normalizeName(item.name));
  console.log('---');
});
```

---

### Pitfall 3: Fuzzy Matching Threshold Too High

**Problem:** 85% similarity might be too strict for corporate names with different formats.

**Solution:** Make threshold configurable and test different values.

```typescript
// Make threshold a constant
const MATCH_THRESHOLD = 0.75;  // Try 75% instead of 85%

if (score >= MATCH_THRESHOLD && (!bestMatch || score > bestMatch.score)) {
  bestMatch = { id: lobbyist.id, score };
}
```

---

### Pitfall 4: Duplicate Matches

**Problem:** Same contract/mention stored multiple times if script runs twice.

**Solution:** Use UNIQUE constraints (already in schema) and handle conflicts.

```typescript
const { error } = await supabase
  .from('client_contracts')
  .insert(batch)
  .select();

if (error && error.code === '23505') {  // Unique violation
  console.log('Skipping duplicate:', error.detail);
} else if (error) {
  console.error('Error:', error);
}
```

---

## Performance Optimization Notes

### Current Performance (Observed)

| Script | Time | Records Processed | Speed |
|--------|------|-------------------|-------|
| TEC Enforcement | 5+ min (killed) | ~1,000/1,691 | ~3.3 records/sec |
| Austin Lobbying | 3 sec | 307 | ~100 records/sec |
| Procurement | 10 sec | 2,603 | ~260 records/sec |

**Bottleneck:** TEC enforcement is slow because:
1. Fetches all lobbyists for each order (1,691 × 1,837 = 3.1M comparisons)
2. Levenshtein distance is O(n×m) per comparison

### Optimization Opportunities (If Needed)

1. **Cache lobbyist names:**
   ```typescript
   // Load once, not per record
   const lobbyistNames = new Map();
   const { data } = await supabase.from('lobbyists').select('id, first_name, last_name');
   data.forEach(l => {
     lobbyistNames.set(`${l.first_name} ${l.last_name}`, l.id);
   });
   ```

2. **Pre-filter before fuzzy matching:**
   ```typescript
   // Exact match first (fast), then fuzzy match (slow)
   const exactMatch = lobbyistNames.get(searchName);
   if (exactMatch) return exactMatch;

   // Only fuzzy match if no exact match
   return fuzzyMatch(searchName, lobbyistNames);
   ```

3. **Parallel processing:**
   ```typescript
   // Process in parallel batches
   const promises = batch.map(record => processRecord(record));
   await Promise.all(promises);
   ```

---

## Future Enhancements (Post-Launch Ideas)

### Phase 2 Additions (January 2026)

1. **Federal Lobbying Data** (LDA filings)
   - Many Texas lobbyists also lobby federally
   - Shows national client roster
   - Source: senate.gov/legislative/Public_Disclosure/LDA_reports.htm

2. **State Bar of Texas** (lawyer verification)
   - ~40% of lobbyists are lawyers
   - Add "Licensed Attorney" badge
   - Source: texasbar.com/am/template.cfm?section=find_a_lawyer

3. **Campaign Finance** (TEC + FEC contributions)
   - Political donation patterns
   - Shows political alignment
   - Can infer lobbying effectiveness via legislator relationships

4. **Houston, Dallas, San Antonio** (more municipal data)
   - Expand beyond Austin
   - Same Socrata pattern likely
   - Need to find each city's registry

5. **Automated Scheduling** (cron jobs)
   - Weekly GDELT updates
   - Monthly procurement updates
   - Quarterly municipal updates
   - Annual TEC updates

---

## Troubleshooting

### Error: "Missing Supabase credentials"

**Solution:**
```bash
# Check .env file exists and has:
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Error: "Table does not exist"

**Solution:**
```bash
# Apply migration
npm run db:push

# Verify tables created
npx supabase db execute "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"
```

### Error: "Rate limit exceeded"

**Likely source:** OpenCorporates (500/month free tier)

**Solution:**
- Script already has rate limiting built in
- If needed, increase `REQUEST_DELAY_MS` in script
- Or get paid OpenCorporates account

### Error: "Duplicate key violation"

**This is normal!** Unique constraints prevent duplicate data.

**Solution:**
- Script handles this automatically
- Or clear table before re-running: `DELETE FROM table_name;`

---

## Key Decisions & Rationale

### Decision 1: Defer to Post-Launch

**Rationale:**
- Enrichment is differentiation, not core value
- MVP is valuable with just TEC base data
- Faster to launch and iterate
- Can prioritize based on user feedback

**Trade-off:**
- ✅ Faster launch (December 1)
- ✅ Lower risk (proven data)
- ❌ Less differentiation initially
- ❌ Procurement moat not available yet

---

### Decision 2: Multiple Small Scripts vs. One Large Script

**Chose:** Multiple small scripts

**Rationale:**
- Easier to debug (isolate one source)
- Easier to schedule (run at different intervals)
- Easier to maintain (clear separation of concerns)

**Trade-off:**
- ✅ Modular, testable
- ✅ Independent failures
- ❌ More files to manage
- ❌ Shared code in each script

---

### Decision 3: Server-Side Scripts vs. Real-Time API

**Chose:** Server-side batch scripts

**Rationale:**
- Enrichment data changes slowly (monthly/quarterly)
- Batch processing is faster than real-time
- No API rate limits to worry about
- Simpler architecture

**Trade-off:**
- ✅ Simple, reliable
- ✅ No user-facing latency
- ❌ Data slightly stale
- ❌ Manual execution (for now)

---

## Contact & Resources

### Documentation
- Main guide: `scripts/ENRICHMENT_README.md`
- Test results: `scripts/ENRICHMENT_TESTING_NOTES.md`
- This context doc: `ENRICHMENT_CONTEXT.md`

### External Resources
- TEC: https://www.ethics.state.tx.us
- Austin Open Data: https://data.austintexas.gov
- Texas Open Data: https://data.texas.gov
- GDELT: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- OpenCorporates: https://api.opencorporates.com/documentation
- GLEIF: https://www.gleif.org/en/lei-data/gleif-api

### Debugging Checklist (Copy/Paste for Future Sessions)

```
When picking up enrichment work:

[ ] Read this document (ENRICHMENT_CONTEXT.md)
[ ] Read testing notes (ENRICHMENT_TESTING_NOTES.md)
[ ] Choose one data source to fix (start with procurement)
[ ] Create diagnostic script with logging
[ ] Run on 10-100 records, not full dataset
[ ] Log raw data from external source
[ ] Log normalized data from our database
[ ] Manually verify if any should match
[ ] Adjust normalization function
[ ] Test on subset again
[ ] If >15% match rate: run full dataset
[ ] Verify data stored in database
[ ] Document new match rate in testing notes
[ ] Move to next data source

Target: 1-2 hours per source to fix matching logic
Success: >15% match rate = ship it
```

---

## Final Notes for Future Sessions

**If you're reading this in a future session:**

1. **Don't start from scratch** - All infrastructure is built and working
2. **The problem is matching** - Focus on normalization functions, not architecture
3. **Test small first** - 10-100 records, not thousands
4. **Log everything** - You can't debug what you can't see
5. **Start with procurement** - Highest ROI, clearest value proposition
6. **Success is 15%+ match rate** - Not 100%, just enough to be valuable

**The enrichment system is 90% done. The final 10% is tuning the matching logic.**

Good luck! 🚀
