# Implementation Plan: Bill Tracker

**Branch**: `002-bill-tracker` | **Date**: 2025-11-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-bill-tracker/spec.md`

## Summary

Build a Texas legislative bill tracking system that allows business owners and lobbyists to search, monitor, and receive notifications about Texas bills. The system syncs bill data daily from Texas Legislature FTP, stores it in Supabase (PostgreSQL), provides full-text search, and integrates bill information with lobbyist profiles to drive marketplace connections.

**Primary Requirement**: Enable users to search and track Texas legislative bills with automatic notifications on status changes (premium feature), while connecting bills to lobbyist expertise.

**Technical Approach**:
- Daily data ingestion pipeline from Texas Legislature FTP (`ftp://ftp.legis.state.tx.us`)
- Supabase PostgreSQL for bill storage with full-text search using `tsvector` + GIN indexes
- Astro SSR pages for bill browsing, React islands for interactive search/filtering
- Background job for daily sync (Netlify scheduled functions or cron)
- Email notifications via Resend for premium subscribers
- API routes for watchlist management and bill tagging

## Technical Context

**Language/Version**: TypeScript 5.x (existing project standard), Node.js 18+
**Primary Dependencies**:
- **Frontend**: Astro 5, React 18, Tailwind CSS, shadcn/ui
- **Backend**: Supabase Client SDK, Supabase Edge Functions or Netlify Functions
- **Data Ingestion**: Node.js FTP client (`basic-ftp`), XML/HTML parser (`cheerio` or `fast-xml-parser`)
- **Email**: Resend API (already configured)
- **Scheduling**: Netlify scheduled functions or external cron service (e.g., GitHub Actions)

**Storage**:
- Supabase PostgreSQL (primary database)
- Full-text search via PostgreSQL `tsvector` with GIN indexes
- RLS policies for user-specific watchlists and lobbyist-specific bill tags

**Testing**: Vitest (for TypeScript/Node), Playwright (for E2E)

**Target Platform**:
- Web application (SSR via Netlify)
- Server-side data sync (Netlify Functions or external service)

**Project Type**: Web (existing Astro SSR application)

**Performance Goals**:
- Bill search returns results in <2 seconds for 95% of queries
- Daily sync completes within 1 hour for full session data
- Page load <1.5s for bill detail pages
- Support 1000+ concurrent users during legislative sessions

**Constraints**:
- Must not scrape capitol.texas.gov directly (use FTP only per TLC guidelines)
- Sync frequency limited to daily (avoid overwhelming FTP server)
- Email notification delivery within 1 hour of bill status change
- RLS policies must enforce user privacy (watchlists private to user)

**Scale/Scope**:
- ~1500-2000 bills per regular legislative session (every 2 years)
- ~100-300 bills per special session
- Support 5+ years of historical bills (5 sessions = ~10,000 bills)
- Estimated 500-1000 active users during session, 50-100 between sessions
- Premium tier target: 20% of active users

## Constitution Check

**Status**: ⚠️ No project constitution defined yet

The project does not have a constitution file configured (`.specify/memory/constitution.md` contains only template placeholders). This feature will proceed without constitution gates, but consider establishing project principles for:
- Architectural patterns (islands architecture already in use)
- Database schema conventions (snake_case, RLS policies)
- API contract standards
- Testing requirements

*Recommendation*: Run `/speckit.constitution` after this feature to establish project standards.

## Project Structure

### Documentation (this feature)

```text
specs/002-bill-tracker/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (data source research, sync strategy)
├── data-model.md        # Phase 1 output (database schema for bills)
├── quickstart.md        # Phase 1 output (how to run sync, test bill tracker)
├── contracts/           # Phase 1 output (API endpoint specs)
│   ├── bills-api.yaml          # Bill search/detail endpoints
│   ├── watchlist-api.yaml      # Watchlist CRUD endpoints
│   └── bill-tags-api.yaml      # Lobbyist bill tagging endpoints
├── checklists/
│   └── requirements.md  # Quality validation (PASSED)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Existing Astro + React project structure
src/
├── components/
│   ├── astro/
│   │   ├── bills/                    # NEW: Bill-related Astro components
│   │   │   ├── BillCard.astro
│   │   │   ├── BillDetailLayout.astro
│   │   │   └── BillStatusBadge.astro
│   │   └── (existing: Layout.astro, Header.astro, Footer.astro, SEO.astro)
│   ├── react/
│   │   ├── bills/                    # NEW: Interactive bill components
│   │   │   ├── BillSearchFilter.tsx
│   │   │   ├── BillWatchlistButton.tsx
│   │   │   └── BillTagManager.tsx    # For lobbyists
│   │   └── (existing: SearchFilter.tsx)
│   └── ui/
│       └── (existing shadcn/ui components)
├── lib/
│   ├── api/
│   │   └── bills.ts                  # NEW: Bill API helper functions
│   ├── services/
│   │   ├── billSync.ts               # NEW: FTP sync logic
│   │   ├── billSearch.ts             # NEW: Search query builder
│   │   └── notifications.ts          # NEW: Email notification service
│   ├── supabase.ts                   # EXISTING: Database clients
│   ├── database.types.ts             # UPDATED: Add bill types
│   └── utils.ts                      # EXISTING
├── pages/
│   ├── bills/
│   │   ├── index.astro               # NEW: Bill search/browse page
│   │   ├── [slug].astro              # NEW: Bill detail page
│   │   └── watchlist.astro           # NEW: User's watchlist page
│   ├── api/
│   │   └── bills/
│   │       ├── search.ts             # NEW: Bill search API
│   │       ├── watchlist/
│   │       │   ├── add.ts            # NEW: Add to watchlist
│   │       │   └── remove.ts         # NEW: Remove from watchlist
│   │       └── tags/
│   │           ├── create.ts         # NEW: Lobbyist tag bill
│   │           └── update.ts         # NEW: Update bill insights
│   └── (existing pages)
└── styles/
    └── globals.css                   # EXISTING

# Database migrations
supabase/migrations/
└── YYYYMMDDHHMMSS_add_bill_tracker_schema.sql   # NEW: Bill tables + RLS

# Data ingestion scripts
scripts/
├── sync-bills.ts                     # NEW: FTP sync script (manual or cron)
├── send-bill-notifications.ts        # NEW: Check for updates, send emails
└── (existing scripts)

# Background jobs (Netlify)
netlify/functions/
├── scheduled-bill-sync.ts            # NEW: Daily sync trigger
└── scheduled-notifications.ts        # NEW: Hourly notification check
```

**Structure Decision**: Integrating bill tracker into existing Astro SSR web application structure. New bill-related components follow established patterns (Astro for static, React for interactive). Data ingestion handled via standalone TypeScript scripts that can run via Netlify scheduled functions or external cron.

## Complexity Tracking

*No constitution violations to justify*

## Phase 0: Research & Data Source Analysis

**Objective**: Resolve data source decisions, FTP structure understanding, and sync strategy

### Research Tasks

1. **Texas Legislature FTP Structure Investigation**
   - Connect to `ftp://ftp.legis.state.tx.us` and document directory structure
   - Identify file formats for bills (`/bills/88R/billtext/`, `/bills/88R/billhistory/`)
   - Determine update frequency and file naming conventions
   - Document data schema from example files (XML, HTML, TXT formats)
   - Identify how to detect bill status changes

2. **Sync Strategy Decision**
   - Compare approaches: Full sync daily vs. incremental updates
   - Determine how to track "last sync" timestamp
   - Plan for handling deleted/withdrawn bills
   - Design error handling for FTP connection failures
   - Decide on sync scheduling mechanism (Netlify scheduled functions vs. GitHub Actions cron)

3. **Search Implementation Approach**
   - Evaluate PostgreSQL full-text search vs. external search engine (Meilisearch/Elastic)
   - Design search ranking algorithm (match spec: tier > relevance > views > alphabetical)
   - Plan for search performance at 10,000+ bills scale
   - Design indexes for common query patterns

4. **Notification Architecture**
   - Design bill change detection logic
   - Plan notification batching strategy (digest vs. individual emails)
   - Design email templates for different notification types
   - Determine optimal notification check frequency (hourly vs. real-time)

5. **Alternative Data Source Evaluation**
   - Document LegiScan API as backup option
   - Compare FTP vs. LegiScan (cost, reliability, data completeness)
   - Plan for data source switchover if needed

### Expected Research Outputs

- FTP directory tree documentation
- Sample bill data files (XML/HTML/TXT)
- Data transformation pipeline design
- Sync architecture diagram
- Search strategy comparison table
- Notification workflow diagram

**Deliverable**: `research.md` with all decisions documented

## Phase 1: Design & Contracts

**Prerequisites**: `research.md` complete

### 1. Data Model Design

**Objective**: Create `data-model.md` with complete database schema

**Entities to model** (from spec):
- Bill (core legislative bill data)
- Bill Status (current stage + history)
- Watchlist Entry (user's tracked bills)
- Bill Tag (lobbyist expertise claims)
- Bill Update (change history for notifications)
- Legislative Session (session metadata)
- Subject Area (existing table, may need updates)
- Notification (email log)

**Schema design requirements**:
- Full-text search fields (`tsvector` on title, summary, full_text)
- RLS policies for privacy (watchlists, tags)
- Indexes for common queries (bill number, session, subject area)
- Foreign keys to existing `users`, `lobbyists`, `subject_areas` tables
- Timestamp tracking for sync and notifications

### 2. API Contracts

**Objective**: Generate OpenAPI specs in `/contracts/`

**API endpoints to define** (from functional requirements):

**bills-api.yaml**:
- `GET /api/bills/search` - Search bills by keyword, number, author, subject
- `GET /api/bills/{id}` - Get bill details
- `GET /api/bills/{id}/related` - Get companion bills
- `GET /api/bills/{id}/amendments` - Get amendment history
- `GET /api/bills/{id}/lobbyists` - Get associated lobbyists

**watchlist-api.yaml**:
- `POST /api/bills/watchlist/add` - Add bill to user watchlist
- `DELETE /api/bills/watchlist/remove` - Remove bill from watchlist
- `GET /api/bills/watchlist` - Get user's watchlist
- `PATCH /api/bills/watchlist/{id}/preferences` - Update notification settings

**bill-tags-api.yaml**:
- `POST /api/bills/tags` - Lobbyist tag a bill
- `PATCH /api/bills/tags/{id}` - Update bill insights/notes
- `DELETE /api/bills/tags/{id}` - Remove bill tag
- `GET /api/bills/tags` - Get lobbyist's tagged bills

### 3. Quickstart Guide

**Objective**: Create `quickstart.md` for developers

**Sections**:
- Prerequisites (Supabase access, FTP access)
- Local development setup
- Running manual bill sync
- Testing search functionality
- Triggering test notifications
- Database seeding with sample bills

### 4. Agent Context Update

**Objective**: Update `.claude/` with new bill tracker context

**Run**: `.specify/scripts/bash/update-agent-context.sh claude`

**New technology to add**:
- FTP client library (`basic-ftp`)
- XML/HTML parsers
- Notification scheduling patterns
- Full-text search with PostgreSQL

**Deliverables**:
- `data-model.md`
- `contracts/bills-api.yaml`
- `contracts/watchlist-api.yaml`
- `contracts/bill-tags-api.yaml`
- `quickstart.md`
- Updated agent context file

## Phase 2: Task Breakdown

**Note**: Phase 2 is handled by `/speckit.tasks` command, NOT `/speckit.plan`

The `/speckit.tasks` command will:
- Generate `tasks.md` with implementation tasks
- Organize tasks by user story priority (P1, P2, P3, P4)
- Include dependency ordering
- Provide task estimates

**This planning document stops after Phase 1.**

## Next Steps

After completing this plan:

1. Run `/speckit.tasks` to generate implementation task breakdown
2. Run `/speckit.implement` to execute tasks
3. Consider running `/speckit.constitution` to establish project standards for future features

## Technical Decisions Summary

| Decision Area | Choice | Rationale |
|---------------|--------|-----------|
| Data Source | Texas Legislature FTP (primary) | Free, official source, daily updates |
| Backup Source | LegiScan API | Commercial fallback if FTP unreliable |
| Search Engine | PostgreSQL full-text (`tsvector`) | Leverage existing Supabase, simpler architecture |
| Sync Mechanism | Netlify scheduled functions | Integrated with existing deployment platform |
| Notification Delivery | Resend API (existing) | Already configured, reliable email delivery |
| Data Storage | Supabase PostgreSQL | Existing database, RLS for security |
| Frontend Pattern | Astro pages + React islands | Consistent with existing architecture |

## Risk Assessment

| Risk | Impact | Mitigation |
|------|---------|------------|
| FTP downtime during legislative session | High | Implement LegiScan API fallback, cache data locally |
| Large bill text volumes (performance) | Medium | Lazy load bill text, store summaries separately |
| Notification spam (user annoyance) | Medium | Digest notifications, granular preference controls |
| Search performance at 10k+ bills | Medium | Proper indexing, caching, pagination |
| Lobbyist tag gaming (spam) | Low | User flagging system, admin review queue |
| Session schedule changes (special sessions) | Low | Manual trigger for sync outside schedule |
