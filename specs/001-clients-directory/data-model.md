# Data Model: Browse by Clients Directory

**Feature**: 001-clients-directory
**Date**: 2025-11-11
**Status**: Phase 1 Complete

## Overview

This document defines the data model for the Browse by Clients Directory feature. The feature leverages **existing database tables** (`clients`, `lobbyists`, `subject_areas`) and introduces **two new Postgres functions** for efficient client aggregation and querying.

**Key Design Decisions**:
- **No new tables**: All data exists in current schema
- **Computed fields**: Lobbyist counts and subject area lists are calculated on-demand
- **Many-to-one relationship**: Each client record has one `lobbyist_id`, so a company represented by 5 lobbyists has 5 rows in `clients` table
- **Aggregation layer**: Postgres functions group clients by name and compute aggregates (counts, subject areas)

---

## Entity Definitions

### 1. Client (Aggregated View)

**Source**: Aggregation of `clients` table grouped by `name`

**Description**: Represents a company or organization that is (or was) represented by one or more Texas lobbyists. This is a **computed entity** created by aggregating multiple rows from the `clients` table.

#### Attributes

| Attribute | Type | Source | Description | Validation |
|-----------|------|--------|-------------|------------|
| `name` | string | `clients.name` | Company/organization name (official name) | Required, max 255 chars |
| `slug` | string | Computed | URL-safe version of name (lowercase, hyphenated) | Required, unique, max 100 chars |
| `lobbyist_count` | integer | Computed | Number of unique lobbyists representing this client | >= 1 (clients with 0 excluded) |
| `subject_areas` | string[] | Computed | All unique subject areas from associated lobbyists | Array, can be empty |
| `top_subject_areas` | string[] | Computed | Top 3 most common subject areas | Array, max 3 items |
| `lobbyist_ids` | uuid[] | `clients.lobbyist_id` | List of all lobbyist IDs representing this client | Array, >= 1 item |
| `is_current` | boolean | Computed | True if ANY associated client record has `is_current = true` | Default: filter to show only current |

#### Business Rules

1. **Active Clients Only**: Only include clients where at least one lobbyist relationship has `is_current = true` (spec FR-012)
2. **Unique Slugs**: Slug must be unique across all clients; use numeric suffix for collisions (`acme-corp-2`)
3. **Top Subject Areas**: Determined by frequency across all associated lobbyists (e.g., if 3/5 lobbyists work in Healthcare, it's a top subject)
4. **Lobbyist Count**: `COUNT(DISTINCT lobbyist_id)` - handles multiple client records per lobbyist (different years, different registrations)

#### Sample Data

```json
{
  "name": "AT&T",
  "slug": "att",
  "lobbyist_count": 47,
  "subject_areas": ["Telecommunications", "Technology", "Energy", "Healthcare", "Transportation"],
  "top_subject_areas": ["Telecommunications", "Technology", "Energy"],
  "lobbyist_ids": ["uuid1", "uuid2", "..."],
  "is_current": true
}
```

---

### 2. Lobbyist (Existing Entity)

**Source**: `lobbyists` table (no changes)

**Description**: Individual lobbyist registered with Texas Ethics Commission. Used to populate client detail pages and calculate subject area associations.

#### Relevant Attributes (for this feature)

| Attribute | Type | Source | Description |
|-----------|------|--------|-------------|
| `id` | uuid | `lobbyists.id` | Primary key |
| `first_name` | string | `lobbyists.first_name` | Lobbyist first name |
| `last_name` | string | `lobbyists.last_name` | Lobbyist last name |
| `slug` | string | `lobbyists.slug` | URL-safe identifier |
| `profile_image_url` | string | `lobbyists.profile_image_url` | Photo URL (nullable) |
| `subject_areas` | string[] | `lobbyists.subject_areas` | Array of subject area names |
| `subscription_tier` | enum | `lobbyists.subscription_tier` | `free`, `premium`, or `featured` |
| `is_active` | boolean | `lobbyists.is_active` | Active status |
| `approval_status` | enum | `lobbyists.approval_status` | `pending`, `approved`, `rejected` |

#### Business Rules (from existing schema)
- Only show `is_active = true` AND `approval_status = 'approved'` lobbyists
- Sort by `subscription_tier` (featured > premium > free) on client detail pages

---

### 3. Subject Area (Existing Entity)

**Source**: `subject_areas` table (no changes)

**Description**: Policy/industry categories for filtering and categorization.

#### Relevant Attributes

| Attribute | Type | Source | Description |
|-----------|------|--------|-------------|
| `id` | uuid | `subject_areas.id` | Primary key |
| `name` | string | `subject_areas.name` | Display name (e.g., "Healthcare") |
| `slug` | string | `subject_areas.slug` | URL-safe identifier |
| `description` | string | `subject_areas.description` | Category description (nullable) |

#### Business Rules
- Filter options populated from all unique subject areas across active lobbyists
- Multi-select with OR logic (spec FR-005): Show clients if ANY of their lobbyists work in selected subjects

---

## Relationships

### Client ↔ Lobbyist (Many-to-Many through existing schema)

**Implementation**: The `clients` table has a `lobbyist_id` foreign key, creating a one-to-many relationship from lobbyists to clients. For our aggregated view, we reverse this to group by client name.

```
clients table (existing):
┌──────────┬──────────────┬──────────────────┬────────────┐
│ id       │ name         │ lobbyist_id (FK) │ is_current │
├──────────┼──────────────┼──────────────────┼────────────┤
│ uuid1    │ AT&T         │ lobbyist-a       │ true       │
│ uuid2    │ AT&T         │ lobbyist-b       │ true       │
│ uuid3    │ AT&T         │ lobbyist-c       │ false      │
│ uuid4    │ H-E-B        │ lobbyist-d       │ true       │
└──────────┴──────────────┴──────────────────┴────────────┘

Aggregated Client entity:
┌──────────┬────────┬─────────────────┐
│ name     │ slug   │ lobbyist_count  │
├──────────┼────────┼─────────────────┤
│ AT&T     │ att    │ 2               │ (excludes lobbyist-c: is_current=false)
│ H-E-B    │ heb    │ 1               │
└──────────┴────────┴─────────────────┘
```

**Cardinality**:
- **Clients table**: Many clients → One lobbyist (many-to-one via `lobbyist_id`)
- **Aggregated view**: One client (name) → Many lobbyists (computed)

**Join Pattern** (for Postgres function):
```sql
SELECT
  c.name,
  COUNT(DISTINCT c.lobbyist_id) as lobbyist_count,
  ARRAY_AGG(DISTINCT c.lobbyist_id) as lobbyist_ids
FROM clients c
WHERE c.is_current = true
GROUP BY c.name
HAVING COUNT(DISTINCT c.lobbyist_id) > 0  -- FR-012: exclude zero-lobbyist clients
```

---

### Client ↔ Subject Area (Indirect through Lobbyist)

**Implementation**: Clients don't have direct subject area relationships. Subject areas are derived from their associated lobbyists' `subject_areas` array field.

```
Lobbyists:
┌──────────────┬──────────────────────────────┐
│ id           │ subject_areas                │
├──────────────┼──────────────────────────────┤
│ lobbyist-a   │ ["Healthcare", "Energy"]     │
│ lobbyist-b   │ ["Healthcare", "Technology"] │
│ lobbyist-d   │ ["Agriculture"]              │
└──────────────┴──────────────────────────────┘

Clients ← Lobbyists:
┌──────────┬─────────────────────────────────────┐
│ name     │ subject_areas (computed from join)  │
├──────────┼─────────────────────────────────────┤
│ AT&T     │ ["Healthcare", "Energy", "Tech"]    │ (union of lobbyist-a + lobbyist-b)
│ H-E-B    │ ["Agriculture"]                     │ (from lobbyist-d)
└──────────┴─────────────────────────────────────┘
```

**Join Pattern**:
```sql
SELECT
  c.name,
  ARRAY_AGG(DISTINCT subj) as subject_areas
FROM clients c
JOIN lobbyists l ON c.lobbyist_id = l.id
CROSS JOIN UNNEST(l.subject_areas) as subj
WHERE c.is_current = true AND l.is_active = true
GROUP BY c.name
```

**Top 3 Subject Areas** (for client cards):
```sql
-- Count frequency of each subject across lobbyists
WITH subject_counts AS (
  SELECT
    c.name,
    subj,
    COUNT(*) as freq
  FROM clients c
  JOIN lobbyists l ON c.lobbyist_id = l.id
  CROSS JOIN UNNEST(l.subject_areas) as subj
  GROUP BY c.name, subj
)
SELECT ARRAY_AGG(subj ORDER BY freq DESC LIMIT 3) as top_subject_areas
FROM subject_counts
GROUP BY name;
```

---

## Computed Fields

### lobbyist_count

**Formula**: `COUNT(DISTINCT clients.lobbyist_id WHERE clients.is_current = true)`

**Purpose**: Display social proof ("Represented by 47 lobbyists")

**Performance**: Indexed on `clients.lobbyist_id` (existing foreign key index)

**Validation**: Must be >= 1 (spec FR-012: exclude zero-count clients)

---

### top_subject_areas (Top 3)

**Formula**:
1. Unnest all `subject_areas` arrays from associated lobbyists
2. Count frequency of each subject
3. Sort by frequency descending
4. Take top 3

**Purpose**: Display on client cards (spec: "up to 3 subject areas")

**Overflow Handling**: If client has 15 subjects, show top 3 + "+12 more" indicator (UI layer, not database)

**Edge Case**: If only 1-2 subjects exist, return 1-2 items (don't pad)

---

### slug

**Formula**:
1. Apply `slugify(name)` utility (lowercase, replace spaces/special chars with hyphens)
2. Check uniqueness against existing slugs
3. If collision, append `-2`, `-3`, etc.

**Example Transformations**:
- "AT&T" → `att`
- "H-E-B" → `heb`
- "Dell, Inc." → `dell-inc`
- "Smith Consulting" (2nd occurrence) → `smith-consulting-2`

**Storage**: Add `slug` column to `clients` table OR compute on-the-fly in Postgres function (decision: compute on-the-fly for MVP, add column later if performance requires)

---

## Database Schema Changes

### Option 1: No Schema Changes (Recommended for MVP)

**Approach**: Use Postgres functions to compute everything on-the-fly from existing tables.

**Pros**:
- No migration risk
- Always up-to-date data
- Simpler implementation

**Cons**:
- Slightly slower queries (acceptable for <5,000 clients, <2s load requirement)
- Slug collisions require runtime handling

---

### Option 2: Add Materialized Columns (Future Optimization)

**Approach**: Add `slug`, `lobbyist_count`, `subject_areas` columns to `clients` table, update via triggers.

**Pros**:
- Faster queries (no aggregation needed)
- Slug uniqueness enforced by database

**Cons**:
- More complex migration
- Stale data risk (requires trigger maintenance)
- Over-engineering for current scale

**Decision**: Use Option 1 (no schema changes) for MVP. Revisit if performance testing shows >2s page loads.

---

## Postgres Function Signatures

### Function 1: get_clients_directory

**Purpose**: Retrieve paginated, filtered, sorted list of clients for directory page

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_clients_directory(
  sort_by text DEFAULT 'lobbyist_count_desc',  -- 'lobbyist_count_desc', 'lobbyist_count_asc', 'name_asc', 'name_desc'
  subject_filters text[] DEFAULT NULL,          -- Array of subject area names (OR logic)
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  name text,
  slug text,                    -- Computed via slugify logic
  lobbyist_count bigint,
  subject_areas text[],         -- All unique subjects
  top_subject_areas text[]      -- Top 3 by frequency
)
LANGUAGE plpgsql;
```

**Logic**:
1. Join `clients` + `lobbyists` tables
2. Filter: `is_current = true` AND `is_active = true`
3. If `subject_filters` provided: Filter where lobbyist's subject_areas overlap with filters
4. Group by `clients.name`
5. Compute aggregates (count, subject arrays)
6. Sort by `sort_by` parameter
7. Apply `LIMIT` and `OFFSET`

**Return Example**:
```json
[
  {
    "name": "AT&T",
    "slug": "att",
    "lobbyist_count": 47,
    "subject_areas": ["Telecommunications", "Energy", "Healthcare", "Technology"],
    "top_subject_areas": ["Telecommunications", "Technology", "Energy"]
  },
  ...
]
```

---

### Function 2: get_client_detail

**Purpose**: Retrieve single client's full details with paginated lobbyist list

**Signature**:
```sql
CREATE OR REPLACE FUNCTION get_client_detail(
  client_slug_param text,
  lobbyist_limit int DEFAULT 20,
  lobbyist_offset int DEFAULT 0
)
RETURNS TABLE (
  name text,
  slug text,
  lobbyist_count bigint,
  subject_areas text[],
  lobbyists jsonb  -- Array of lobbyist objects with pagination
)
LANGUAGE plpgsql;
```

**Lobbyists JSONB Structure**:
```json
{
  "total_count": 47,
  "results": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "slug": "john-doe",
      "profile_image_url": "https://...",
      "subject_areas": ["Healthcare", "Energy"],
      "subscription_tier": "premium"
    },
    ...
  ]
}
```

**Logic**:
1. Find all `clients` rows matching computed slug
2. Aggregate client details (name, count, subjects)
3. Join `lobbyists` table with pagination
4. Sort lobbyists by `subscription_tier` (featured > premium > free), then `last_name`
5. Return as JSONB for easy parsing in TypeScript

---

## State Transitions

**N/A**: This feature is read-only. Clients and lobbyists are managed through existing admin processes (CSV import, profile claiming). No state transitions specific to this feature.

---

## Validation Rules

### Client Name
- **Required**: Must not be null or empty string
- **Max Length**: 255 characters (database limit)
- **Uniqueness**: NOT enforced (multiple clients can have same name - differentiated by slug suffix)

### Client Slug
- **Required**: Must not be null or empty string
- **Unique**: Must be unique across all clients
- **Format**: Lowercase, alphanumeric + hyphens, max 100 chars
- **Pattern**: `/^[a-z0-9]+(?:-[a-z0-9]+)*(?:-\d+)?$/` (optional numeric suffix)

### Lobbyist Count
- **Minimum**: >= 1 (clients with 0 lobbyists excluded from directory)
- **Type**: Positive integer

### Subject Areas
- **Type**: Array of strings
- **Can be empty**: Yes (if lobbyists have no subject areas)
- **Duplicates**: Removed (use `ARRAY_AGG(DISTINCT ...)`)

---

## Data Model Summary Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Aggregated Client                        │
│  (Computed View via Postgres Function)                     │
├─────────────────────────────────────────────────────────────┤
│ + name: string                                              │
│ + slug: string (computed, unique)                           │
│ + lobbyist_count: int (computed)                            │
│ + subject_areas: string[] (computed)                        │
│ + top_subject_areas: string[] (computed, max 3)             │
│ + lobbyist_ids: uuid[] (from clients.lobbyist_id)          │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Aggregates from
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  clients (Existing Table)                   │
├─────────────────────────────────────────────────────────────┤
│ + id: uuid (PK)                                             │
│ + name: string                                              │
│ + lobbyist_id: uuid (FK → lobbyists.id)                    │
│ + is_current: boolean                                       │
│ + year_started: int                                         │
│ + year_ended: int (nullable)                                │
│ + ... (other fields)                                        │
└────────────┬────────────────────────────────────────────────┘
             │
             │ Many-to-One
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                lobbyists (Existing Table)                   │
├─────────────────────────────────────────────────────────────┤
│ + id: uuid (PK)                                             │
│ + first_name: string                                        │
│ + last_name: string                                         │
│ + slug: string (unique)                                     │
│ + subject_areas: string[] (array field)                     │
│ + subscription_tier: enum (free/premium/featured)           │
│ + is_active: boolean                                        │
│ + approval_status: enum (pending/approved/rejected)         │
└────────────┬────────────────────────────────────────────────┘
             │
             │ References (via array values)
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│            subject_areas (Existing Table)                   │
├─────────────────────────────────────────────────────────────┤
│ + id: uuid (PK)                                             │
│ + name: string                                              │
│ + slug: string (unique)                                     │
│ + description: string (nullable)                            │
└─────────────────────────────────────────────────────────────┘
```

---

## TypeScript Type Definitions

**File**: `src/lib/api/clients.ts` (to be created)

```typescript
import type { Database } from '@/lib/database.types';

// Aggregated client type (return from Postgres function)
export interface ClientSummary {
  name: string;
  slug: string;
  lobbyist_count: number;
  subject_areas: string[];
  top_subject_areas: string[];
}

// Full client detail with lobbyists
export interface ClientDetail {
  name: string;
  slug: string;
  lobbyist_count: number;
  subject_areas: string[];
  lobbyists: {
    total_count: number;
    results: LobbyistSummary[];
  };
}

// Lobbyist summary (for client detail page)
export interface LobbyistSummary {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  profile_image_url: string | null;
  subject_areas: string[];
  subscription_tier: 'free' | 'premium' | 'featured';
}

// Search/filter parameters
export interface ClientSearchParams {
  sort?: 'lobbyist_count_desc' | 'lobbyist_count_asc' | 'name_asc' | 'name_desc';
  subjects?: string[];  // Subject area names
  limit?: number;
  offset?: number;
}
```

---

## Data Migration Plan

### Migration File: `[timestamp]_add_client_aggregation_functions.sql`

**Tasks**:
1. Create `get_clients_directory()` function
2. Create `get_client_detail()` function
3. (Optional) Add `slug` column to `clients` table if performance requires
4. (Optional) Add GIN index on `lobbyists.subject_areas` if query planner shows sequential scans

**Rollback Plan**:
```sql
DROP FUNCTION IF EXISTS get_clients_directory;
DROP FUNCTION IF EXISTS get_client_detail;
-- (If slug column added) ALTER TABLE clients DROP COLUMN slug;
```

### Data Integrity Checks (Post-Migration)

1. **Verify all clients have at least one lobbyist**:
   ```sql
   SELECT COUNT(*) FROM get_clients_directory() WHERE lobbyist_count = 0;
   -- Expected: 0
   ```

2. **Verify slug uniqueness**:
   ```sql
   SELECT slug, COUNT(*) FROM get_clients_directory() GROUP BY slug HAVING COUNT(*) > 1;
   -- Expected: 0 rows
   ```

3. **Verify subject area arrays are not null**:
   ```sql
   SELECT COUNT(*) FROM get_clients_directory() WHERE subject_areas IS NULL;
   -- Expected: 0
   ```

---

## Performance Considerations

### Query Performance Targets (from spec SC-002, SC-006)

- Directory page load: <2 seconds for 5,000 clients
- Filter/sort operations: <500ms (95th percentile)

### Optimization Strategies

1. **Indexes** (existing + potential additions):
   - ✅ Existing: `clients.lobbyist_id` (foreign key index)
   - ✅ Existing: `lobbyists.subject_areas` (GIN index for array containment)
   - ⏳ Add if needed: `clients.name` (B-tree for GROUP BY)
   - ⏳ Add if needed: `clients.is_current` (B-tree for WHERE filter)

2. **Query Plan Analysis**:
   - Run `EXPLAIN ANALYZE` on both functions with realistic data
   - Look for sequential scans, high row counts
   - Add indexes where `cost` is highest

3. **Caching**:
   - SSR caching via Netlify CDN: `Cache-Control: public, max-age=300, stale-while-revalidate=600` (5min cache, 10min stale)
   - No application-level caching for MVP (add Redis later if needed)

---

**Data Model Status**: ✅ **COMPLETE**

Ready to proceed to **API Contracts** and **Quickstart Guide**.
