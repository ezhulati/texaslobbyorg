# Implementation Plan: Browse by Clients Directory

**Branch**: `001-clients-directory` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-clients-directory/spec.md`

## Summary

This feature creates a reverse discovery path for TexasLobby.org, allowing business owners to browse companies/organizations by their lobbying representation. The feature includes:

1. **Clients directory page** (`/clients`) showing all companies with active lobbyist relationships, sorted by lobbyist count with subject area filtering
2. **Individual client detail pages** (`/clients/[slug]`) displaying full lobbyist rosters with Schema.org markup for SEO
3. **Navigation integration** with toggle between "Browse by Lobbyists" and "Browse by Clients"

**Technical Approach**: Leverage existing Astro SSR architecture and database schema. Create parallel page structure to existing lobbyist pages (`/lobbyists/*`). Build Postgres views/functions for efficient client aggregation queries. Use existing React islands pattern for filtering/sorting UI with client-side hydration.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20+
**Primary Dependencies**: Astro 5, React 18, Supabase client, Tailwind CSS, shadcn/ui
**Storage**: Supabase PostgreSQL (existing `clients`, `lobbyists`, `subject_areas` tables)
**Testing**: Playwright for E2E, Vitest for unit tests (based on project patterns)
**Target Platform**: Web SSR (Netlify Edge Functions)
**Project Type**: Web application (Astro islands with React interactivity)
**Performance Goals**: <2s page load for 5,000 clients, <500ms filter/sort operations (95th percentile)
**Constraints**: SEO-critical (static HTML with Schema.org markup), mobile-responsive, accessibility (WCAG AA)
**Scale/Scope**: ~1,687 clients (current dataset), 2 new pages, 2-3 React components, 2 Postgres functions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ **PASSED** (Constitution is unpopulated - no violations possible)

The project's constitution file (`.specify/memory/constitution.md`) contains only placeholder content with no active principles or constraints. Therefore, there are no gates to evaluate and no violations to justify.

**Note**: If constitution principles are added in the future (e.g., "Library-First", "Test-First", "No New Dependencies"), this section must be re-evaluated to ensure compliance.

## Project Structure

### Documentation (this feature)

```text
specs/001-clients-directory/
├── plan.md              # This file
├── spec.md              # Feature specification (completed)
├── checklists/
│   └── requirements.md  # Specification quality checklist (completed)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated)
│   └── clients-api.json # OpenAPI spec for client queries
└── tasks.md             # Phase 2 output (via /speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── pages/
│   └── clients/
│       ├── index.astro           # NEW: Clients directory page
│       └── [slug].astro          # NEW: Individual client detail page
├── components/
│   ├── astro/
│   │   ├── ClientCard.astro      # NEW: Client card for directory listing
│   │   └── ClientLobbyistList.astro  # NEW: Lobbyist roster on client page
│   └── react/
│       └── ClientsFilter.tsx     # NEW: Filter/sort controls (islands hydration)
└── lib/
    ├── supabase.ts               # EXISTING: Database client (no changes needed)
    ├── database.types.ts         # EXISTING: Generated types (will include new functions)
    └── utils.ts                  # EXISTING: Contains slugify() and other helpers

supabase/
└── migrations/
    └── [timestamp]_add_client_aggregation_functions.sql  # NEW: Postgres functions

tests/
└── e2e/
    └── clients-directory.spec.ts  # NEW: Playwright tests for client pages
```

**Structure Decision**: Selected **web application structure** (Astro islands + SSR). This feature integrates into the existing Astro 5 codebase following established patterns:

- **Pages**: Mirror the `/lobbyists/*` structure with `/clients/*` routes
- **Components**: Follow existing split (Astro for static/server-rendered, React for interactive filtering)
- **Database**: Add Postgres functions for client aggregation queries (similar to existing `search_lobbyists()` function)
- **Types**: Leverage auto-generated TypeScript types from Supabase schema
- **Styling**: Use existing Tailwind + shadcn/ui component library

No architectural changes needed - this is a content expansion using proven patterns.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**Status**: N/A (No constitution violations)

---

## Phase 0: Research & Technology Decisions

**Status**: ⏳ Pending (to be executed in research.md)

### Research Tasks

The following unknowns from Technical Context require research:

1. **Database Query Optimization**
   - Research: Best practices for aggregating client-lobbyist counts efficiently in Postgres
   - Decision needed: View vs materialized view vs function for client aggregation
   - Rationale: Need to support <2s page loads for 5,000 clients with real-time counts

2. **Pagination Strategy**
   - Research: Astro SSR pagination patterns with URL query parameters
   - Decision needed: Server-side vs client-side pagination, offset vs cursor-based
   - Rationale: Spec requires 50 clients per page (directory) and 20 lobbyists per page (detail)

3. **Schema.org Markup**
   - Research: Organization schema requirements and best practices for SEO
   - Decision needed: JSON-LD structure for client pages, required fields
   - Rationale: Success criteria SC-004 targets first-page Google ranking

4. **Filter State Management**
   - Research: URL-based state vs React state for filters (subject area, sort options)
   - Decision needed: Which state management approach for 15+ subject area filters
   - Rationale: Need to support deep linking and back-button behavior

5. **Slug Collision Handling**
   - Research: Strategies for handling duplicate client names (e.g., "Smith Consulting" x3)
   - Decision needed: Slug suffix pattern (numeric, location-based, UUID)
   - Rationale: Spec assumption #2 requires unique slugs without data validation

### Technologies to Investigate

- **Postgres text search**: Review existing `search_lobbyists()` function pattern
- **Astro data fetching**: Review existing patterns in `/lobbyists/index.astro`
- **React Query/SWR**: Evaluate if needed for client-side filter updates (or use vanilla React state)
- **Testing frameworks**: Confirm Playwright + Vitest setup from existing tests

**Output**: See `research.md` (to be generated)

## Phase 1: Data Model & Contracts

**Status**: ⏳ Pending (to be executed after research.md completion)

### Data Model Artifacts

1. **data-model.md**
   - Client entity (aggregated view)
   - Client-Lobbyist relationships (many-to-many through existing schema)
   - Subject area associations (derived from lobbyist relationships)
   - Computed fields: lobbyist_count, subject_areas (top 3)
   - State transitions: N/A (read-only view of existing data)

2. **Database Contracts**
   - Postgres function: `get_clients_directory(sort_by, subject_filter, limit, offset)`
   - Postgres function: `get_client_detail(client_slug)`
   - Return types: Client directory result set, client detail result set
   - Indexes: Review existing indexes on `clients.lobbyist_id`, add GIN index for subject area queries if needed

### API Contracts

**Directory**: `specs/001-clients-directory/contracts/`

Files to generate:
- `clients-directory-query.sql` - Postgres function SQL definitions
- `clients-api.json` - OpenAPI 3.0 spec for client endpoints (if REST API needed)

**Note**: This feature is primarily server-rendered (Astro SSR), so API contracts may be lightweight. Focus on Postgres function signatures.

### Developer Onboarding

**quickstart.md** will cover:
1. Prerequisites: Database migration, type generation
2. Running the dev server and accessing `/clients`
3. Database query patterns (using Supabase client)
4. Component architecture (Astro vs React islands)
5. Testing approach (E2E + contract tests)

**Output**: See `data-model.md`, `/contracts/*`, `quickstart.md` (to be generated)

## Phase 2: Implementation Tasks

**Status**: ⏳ Not started (requires `/speckit.tasks` command)

Tasks will be generated in `tasks.md` following the prioritized user stories from spec:

1. **P1: Browse Clients Directory** (User Story 1)
   - Database migration with aggregation functions
   - `/clients` page with server-side rendering
   - Basic client cards with name, lobbyist count, subject tags
   - Default sorting by lobbyist count

2. **P2: Sort and Filter Clients** (User Story 2)
   - React `ClientsFilter` component with hydration
   - Subject area multi-select filters (OR logic)
   - Sort options (count, alphabetical)
   - URL state management for filters
   - Empty state handling

3. **P1: View Individual Client Detail Page** (User Story 3)
   - `/clients/[slug]` dynamic route
   - Client detail page with full lobbyist roster
   - Pagination for 20 lobbyists per page
   - Schema.org Organization markup
   - Integration with existing lobbyist profile links

4. **P3: Navigate Between Browse Modes** (User Story 4)
   - Navigation toggle/tabs in header
   - Update existing `/lobbyists` page to show toggle
   - Fresh state on mode switch

**Output**: See `tasks.md` (via `/speckit.tasks` command after Phase 1 completion)

## Next Steps

1. ✅ **Completed**: Specification (`spec.md`) and quality checklist
2. ✅ **Completed**: Implementation plan (`plan.md`) - this document
3. ⏳ **Next**: Execute Phase 0 research tasks → generate `research.md`
4. ⏳ **Then**: Execute Phase 1 design → generate `data-model.md`, `/contracts/*`, `quickstart.md`
5. ⏳ **Then**: Run `/speckit.tasks` to generate `tasks.md`
6. ⏳ **Finally**: Run `/speckit.implement` to execute tasks

**Command**: Continue with Phase 0 research generation (autonomous execution within this planning session).

---

## Notes

- **Existing patterns to follow**: Study `/lobbyists/index.astro` and `/lobbyists/[slug].astro` as reference implementation
- **Database schema**: No table changes needed - use existing `clients`, `lobbyists`, `subject_areas` tables
- **Performance**: Leverage existing database indexes; add new indexes only if query plans show table scans
- **SEO**: Schema.org markup critical for SC-004 success criteria (first-page Google ranking)
- **Testing**: Prioritize E2E tests for user stories P1 (directory + detail pages) over P2/P3 features
