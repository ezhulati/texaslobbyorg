# Research: Browse by Clients Directory

**Feature**: 001-clients-directory
**Date**: 2025-11-11
**Status**: Completed

## Executive Summary

This document resolves all technical unknowns identified in the implementation plan. Research focused on aligning with existing TexasLobby.org patterns from the `/lobbyists/*` implementation, leveraging proven architectural decisions and database query strategies.

**Key Findings**:
- Use Postgres function (not view/materialized view) for client aggregation - matches existing `search_lobbyists()` pattern
- Server-side pagination with offset-based queries - proven approach from lobbyist directory
- Schema.org Organization JSON-LD markup - established pattern from lobbyist profiles
- URL-based state management for filters - existing approach with query parameters
- Numeric suffix pattern for slug collisions - extend existing `slugify()` utility

---

## Research Area 1: Database Query Optimization

### Decision: Postgres Function with Aggregation Queries

**Rationale**:
The existing codebase uses a Postgres function `search_lobbyists()` (database.types.ts:1996-2021) for complex queries with filtering, sorting, and ranking. This same pattern should be applied for client aggregation to ensure consistency and performance.

**Alternatives Considered**:

1. **Materialized View** (REJECTED)
   - **Pros**: Fast reads, pre-computed aggregations
   - **Cons**: Requires refresh strategy, stale data risk, adds complexity for real-time counts
   - **Why rejected**: Spec requires real-time lobbyist counts (no staleness tolerance mentioned), adds maintenance burden

2. **Standard Postgres View** (REJECTED)
   - **Pros**: Always up-to-date, simpler than materialized view
   - **Cons**: Slower than function for complex aggregations, no optimization control
   - **Why rejected**: Less flexible than function for future enhancements (search, ranking)

3. **Postgres Function with CTEs** (SELECTED ✓)
   - **Pros**: Matches existing `search_lobbyists()` pattern, flexible filtering/sorting, query plan optimization, supports pagination
   - **Cons**: Requires migration file, more initial setup
   - **Why selected**: Proven approach in codebase, enables future search functionality, best performance for <2s page load requirement (SC-002)

**Implementation Pattern**:
```sql
-- Create function: get_clients_directory
CREATE OR REPLACE FUNCTION get_clients_directory(
  sort_by text DEFAULT 'lobbyist_count_desc',
  subject_filters text[] DEFAULT NULL,
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  client_name text,
  client_slug text,
  lobbyist_count bigint,
  subject_areas text[],
  top_subject_areas text[]  -- Limited to top 3
)
-- ... CTE with GROUP BY clients.name, ORDER BY, LIMIT/OFFSET
```

**Performance Considerations**:
- Leverage existing GIN indexes on `lobbyists.subject_areas` array
- Add index on `clients.name` for GROUP BY performance (if query plan shows table scan)
- Use `COUNT(DISTINCT lobbyists.id)` to handle one-to-many client-lobbyist relationships

**References**:
- Existing pattern: `search_lobbyists()` in database.types.ts:1996
- Similar aggregation: `getLobbyistCount()` in src/lib/api/lobbyists.ts:150

---

## Research Area 2: Pagination Strategy

### Decision: Server-Side Offset-Based Pagination with URL Query Parameters

**Rationale**:
The lobbyist directory (`src/pages/lobbyists/index.astro`) uses server-side offset-based pagination with `?page=N` query parameters (lines 26-27, 194-252). This is the established pattern and should be reused for consistency.

**Alternatives Considered**:

1. **Client-Side Pagination** (REJECTED)
   - **Pros**: Instant page transitions, no server round-trip
   - **Cons**: Breaks SEO (all pages same URL), breaks back button, loads all data upfront
   - **Why rejected**: SEO-critical feature (SC-004 targets Google ranking), violates spec assumption #6 (URL structure matters)

2. **Cursor-Based Pagination** (REJECTED)
   - **Pros**: Better performance for very large datasets (>100k rows), stable ordering
   - **Cons**: No jump-to-page functionality, complex URL structure, overkill for ~1,687 clients
   - **Why rejected**: Dataset is small, users expect page numbers (UX), existing pattern uses offset

3. **Server-Side Offset Pagination** (SELECTED ✓)
   - **Pros**: SEO-friendly URLs, matches existing pattern, simple implementation, supports "jump to page"
   - **Cons**: Performance degrades at very high offsets (not an issue for <5,000 clients)
   - **Why selected**: Proven pattern in `/lobbyists` (24 per page), meets <2s load requirement for 5,000 clients

**Implementation Details**:
- **Directory page**: 50 clients per page (per spec FR-010)
- **Client detail page**: 20 lobbyists per page (per spec FR-010)
- **URL format**: `/clients?page=2&subject=healthcare` (mirrors `/lobbyists?page=2&subject=healthcare`)
- **Pagination UI**: Reuse existing component logic from lobbyists/index.astro:194-252

**Code Pattern** (from lobbyists/index.astro):
```typescript
const page = parseInt(url.searchParams.get('page') || '1');
const perPage = 50;  // Changed from 24
const offset = (page - 1) * perPage;
// Pass to Postgres function: limit_count: perPage, offset_count: offset
```

**References**:
- Existing implementation: src/pages/lobbyists/index.astro:26-27 (page extraction)
- Pagination UI: src/pages/lobbyists/index.astro:194-252 (Previous/Next/Page Numbers)

---

## Research Area 3: Schema.org Markup

### Decision: Organization Schema with JSON-LD, Optional LocalBusiness

**Rationale**:
The lobbyist directory uses Schema.org ItemList markup (lobbyists/index.astro:85-99) and Person schema for individual profiles. For clients, Organization schema is most appropriate, with optional LocalBusiness if location data becomes available.

**Schema.org Organization Properties** (Required for SEO):
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Client Company Name",
  "url": "https://texaslobby.org/clients/client-slug",
  "description": "Represented by N Texas lobbyists in [subject areas]",
  "knowsAbout": ["Healthcare", "Energy"],  // Subject areas
  "alumni": [  // Lobbyists representing them
    {
      "@type": "Person",
      "name": "John Doe",
      "url": "https://texaslobby.org/lobbyists/john-doe"
    }
  ]
}
```

**Alternative Properties Considered**:
- **`@type: LocalBusiness`**: Use if `registered_address` field is populated (currently nullable in clients table)
- **`@type: Corporation`**: More specific than Organization, but may not apply to non-profits/associations
- **`legalName`**: Map from `clients.legal_name` if available (currently nullable)

**Directory Page Schema**:
Reuse ItemList pattern from lobbyists directory:
```json
{
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": "Organization",
        "name": "Client Name",
        "url": "https://texaslobby.org/clients/slug"
      }
    }
  ],
  "numberOfItems": totalCount
}
```

**SEO Best Practices** (from Google's guidelines):
- Include JSON-LD in `<head>` or at end of `<body>`
- Validate with Google Rich Results Test before launch
- Include canonical URL to avoid duplicate content issues
- Use `knowsAbout` for subject area keywords (helps with "[Company] + [Subject]" searches)

**References**:
- Existing pattern: src/pages/lobbyists/index.astro:84-99 (ItemList schema)
- Schema.org docs: https://schema.org/Organization (official specification)
- Success criteria: SC-004 (first-page ranking for "[Company Name] Texas lobbyist")

---

## Research Area 4: Filter State Management

### Decision: URL Query Parameters (Server-Side State)

**Rationale**:
The existing lobbyist directory uses URL query parameters for filter state (`?city=austin&subject=healthcare`), which is the correct approach for SEO, deep linking, and back-button behavior. This pattern must be replicated for clients.

**State Management Pattern**:
1. **Server-side**: Extract filter params from URL in Astro frontmatter
2. **Client-side**: React component updates URL on filter change (triggers page reload)
3. **Persistence**: URL is the source of truth (no localStorage, no React state)

**Implementation** (from existing code):
```typescript
// Server-side (Astro frontmatter)
const url = new URL(Astro.request.url);
const subjectFilter = url.searchParams.get('subject') || '';
const sortBy = url.searchParams.get('sort') || 'lobbyist_count_desc';
const page = parseInt(url.searchParams.get('page') || '1');

// Build search params
const searchParams = {
  subjects: subjectFilter ? [subjectFilter] : undefined,
  sort: sortBy,
  limit: 50,
  offset: (page - 1) * 50,
};
```

**React Filter Component** (to be created: `ClientsFilter.tsx`):
- Use `window.location.href` to update URL (triggers server re-render)
- Or use Astro's `navigate()` API for client-side routing (if enabled)
- Display active filters with remove buttons (see lobbyists/index.astro:127-162)

**Multi-Select Subject Filters** (Spec FR-005):
- URL format: `/clients?subject=healthcare&subject=energy` (OR logic)
- Or: `/clients?subjects=healthcare,energy` (comma-separated)
- **Chosen**: Comma-separated for cleaner URLs and easier parsing

**Sort Options** (Spec FR-004):
- `?sort=lobbyist_count_desc` (default)
- `?sort=lobbyist_count_asc`
- `?sort=name_asc`
- `?sort=name_desc`

**Clear Filters Button**:
Redirect to `/clients` (no query params) - see lobbyists/index.astro:155-160

**Why NOT React State**:
- ❌ Breaks SEO (all URLs identical)
- ❌ Breaks back button
- ❌ Can't share filtered URLs
- ❌ Inconsistent with existing pattern

**References**:
- URL extraction: src/pages/lobbyists/index.astro:23-27
- Active filters UI: src/pages/lobbyists/index.astro:127-162
- Filter component: src/components/react/SearchFilter.tsx (for reference)

---

## Research Area 5: Slug Collision Handling

### Decision: Numeric Suffix with Unique Constraint

**Rationale**:
The existing `slugify()` utility (src/lib/utils.ts) converts text to URL-safe slugs, but doesn't handle collisions. The database schema must enforce unique slugs, and the import/creation logic must append numeric suffixes when collisions occur.

**Slug Generation Pattern**:
```typescript
// Base slug
let slug = slugify(clientName);  // "acme-corp"

// Check uniqueness
let finalSlug = slug;
let counter = 2;
while (await slugExists(finalSlug)) {
  finalSlug = `${slug}-${counter}`;  // "acme-corp-2"
  counter++;
}
```

**Database Schema Update** (migration required):
```sql
-- Add unique constraint to clients table (if not exists)
-- Note: Current schema doesn't show a slug column, so we need to add it
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_clients_slug ON clients(slug);
```

**Collision Scenarios** (from spec edge cases):
1. **Identical names**: "Smith Consulting" appears 3 times
   - Slugs: `smith-consulting`, `smith-consulting-2`, `smith-consulting-3`
2. **Special characters**: "AT&T", "H-E-B", "Dell, Inc."
   - Slugs: `att`, `heb`, `dell-inc`
3. **Very long names**: Truncate to 100 chars (Postgres text limit for indexes)
   - Pattern: `slugify(name).substring(0, 100)`

**Additional Context for Disambiguation** (Optional Enhancement):
If `clients.registered_address` or `clients.jurisdiction` fields are populated:
- Display city/state in UI: "Smith Consulting (Austin, TX)"
- URL still uses numeric suffix: `/clients/smith-consulting-2`
- Schema markup includes address if available

**Migration Strategy**:
For existing clients without slugs (retroactive migration):
```sql
-- Generate slugs for all existing clients
UPDATE clients
SET slug = generate_unique_slug(name)  -- Function to handle collisions
WHERE slug IS NULL;
```

**References**:
- Existing utility: src/lib/utils.ts (slugify function)
- Lobbyist slug pattern: database.types.ts:833 (lobbyists.slug field)
- Edge case: spec.md:82 (clients with identical names)

---

## Research Area 6: Testing Framework (Supplemental Research)

### Decision: Playwright for E2E, Vitest for Unit/Integration

**Rationale**:
Based on project dependencies and Astro 5 best practices, use Playwright for end-to-end testing of the full user journey, and Vitest for unit testing helper functions and API modules.

**Test Coverage Priorities** (from spec user stories):
1. **P1 - Browse Clients Directory** (User Story 1)
   - E2E: Navigate to `/clients`, verify client cards render, check sorting
   - Contract: Postgres function returns correct lobbyist counts

2. **P1 - View Client Detail Page** (User Story 3)
   - E2E: Click client → verify detail page loads, Schema.org markup present
   - Contract: Postgres function returns correct lobbyist list for client

3. **P2 - Sort and Filter Clients** (User Story 2)
   - E2E: Apply subject filter, change sort order, verify results update
   - Unit: URL parameter parsing logic

**Test File Structure**:
```text
tests/
└── e2e/
    ├── clients-directory.spec.ts  # Browse + filter tests
    └── client-detail.spec.ts      # Individual client page tests
```

**Sample Test** (Playwright):
```typescript
test('clients are sorted by lobbyist count by default', async ({ page }) => {
  await page.goto('/clients');
  const firstClient = page.locator('[data-testid="client-card"]').first();
  const firstCount = await firstClient.locator('[data-testid="lobbyist-count"]').textContent();
  // Assert first client has highest count
});
```

**References**:
- Astro testing guide: https://docs.astro.build/en/guides/testing/
- Existing test patterns: Check `/tests` directory (if exists)

---

## Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Pages** | Astro SSR | Existing framework, SEO-friendly |
| **Interactivity** | React islands (client:load) | Existing pattern for filters |
| **Database Queries** | Postgres functions | Matches `search_lobbyists()` pattern |
| **Pagination** | Server-side offset | Proven in `/lobbyists` |
| **State Management** | URL query parameters | SEO + deep linking |
| **Slug Generation** | Extended `slugify()` util | Leverage existing utility |
| **Schema Markup** | JSON-LD Organization | Google-friendly, established pattern |
| **Testing** | Playwright (E2E) + Vitest | Astro 5 best practices |

---

## Open Questions / Future Enhancements

### Resolved During Research:
- ✅ Query optimization approach (Postgres function)
- ✅ Pagination strategy (server-side offset)
- ✅ Schema.org markup (Organization type)
- ✅ Filter state management (URL parameters)
- ✅ Slug collision handling (numeric suffix)

### Deferred to Implementation Phase:
- **Caching Strategy**: Evaluate if Netlify CDN caching + `Cache-Control` headers are sufficient, or if Redis/in-memory caching needed for <2s loads at 5,000 clients (measure first, optimize if needed)
- **Search Functionality**: Spec marks as out-of-scope (only filtering), but Postgres function can be extended in future to support full-text search on client names (similar to `search_lobbyists()`)
- **Client Data Enrichment**: `clients` table has optional fields (description, entity_type, opencorporates_url) that could enhance client detail pages - evaluate data completeness during implementation

---

## References

### Codebase Patterns Analyzed:
1. `src/pages/lobbyists/index.astro` - Directory page pattern
2. `src/pages/lobbyists/[slug].astro` - Detail page pattern (to be reviewed in Phase 1)
3. `src/lib/api/lobbyists.ts` - API helper functions
4. `src/lib/database.types.ts` - Database schema and RPC functions
5. `src/lib/utils.ts` - Utility functions (slugify)

### External Resources:
- Astro Islands Documentation: https://docs.astro.build/en/concepts/islands/
- Schema.org Organization: https://schema.org/Organization
- Postgres Array Functions: https://www.postgresql.org/docs/current/functions-array.html
- Google Rich Results Test: https://search.google.com/test/rich-results

---

**Research Status**: ✅ **COMPLETE**

All technical unknowns have been resolved. Ready to proceed to **Phase 1: Data Model & Contracts**.
