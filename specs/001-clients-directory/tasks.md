# Tasks: Browse by Clients Directory

**Input**: Design documents from `/specs/001-clients-directory/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not requested in feature specification - implementation-focused tasks only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This feature follows **single project structure** with Astro SSR at repository root:
- `src/pages/` - Astro page routes
- `src/components/astro/` - Server-rendered components
- `src/components/react/` - Interactive islands
- `src/lib/api/` - API helper functions
- `supabase/migrations/` - Database migrations

---

## Phase 1: Setup (Database & API Foundation)

**Purpose**: Create database functions and API helpers that all user stories depend on

- [x] T001 Create database migration file at supabase/migrations/[timestamp]_add_client_aggregation_functions.sql
- [x] T002 Copy get_clients_directory function from specs/001-clients-directory/contracts/get_clients_directory.sql into migration file
- [x] T003 Copy get_client_detail function from specs/001-clients-directory/contracts/get_client_detail.sql into migration file
- [x] T004 Run database migration with supabase db push command
- [x] T005 Regenerate TypeScript types with supabase gen types typescript into src/lib/database.types.ts
- [x] T006 [P] Create API helpers file at src/lib/api/clients.ts with ClientSummary and ClientSearchParams type definitions
- [x] T007 [P] Implement searchClients function in src/lib/api/clients.ts that calls get_clients_directory RPC
- [x] T008 [P] Implement getClientBySlug function in src/lib/api/clients.ts that calls get_client_detail RPC
- [x] T009 [P] Implement getClientCount function in src/lib/api/clients.ts for pagination metadata

**Checkpoint**: ✅ Database functions deployed, API helpers ready - user story implementation can begin

---

## Phase 2: User Story 1 - Browse Clients Directory (Priority: P1) 🎯 MVP

**Goal**: Display paginated directory of all clients with lobbyist counts, sorted by default (highest to lowest)

**Independent Test**: Navigate to /clients page, verify clients display with names, lobbyist counts, and subject tags. Verify default sort (highest count first). Verify pagination works.

**Acceptance Criteria from Spec**:
- List of all clients with company name, industry tags, and lobbyist count
- Clients sorted by lobbyist count (highest to lowest) by default
- Up to 3 subject area tags per client with overflow indicator
- Clients with zero lobbyists excluded from directory
- Pagination (50 clients per page)

### Implementation for User Story 1

- [ ] T010 [P] [US1] Create ClientCard component at src/components/astro/ClientCard.astro with props for client name, slug, lobbyist_count, and top_subject_areas
- [ ] T011 [US1] Create clients directory page at src/pages/clients/index.astro with Layout wrapper and SEO metadata
- [ ] T012 [US1] Add URL parameter extraction in src/pages/clients/index.astro for page number (default 1)
- [ ] T013 [US1] Add data fetching in src/pages/clients/index.astro using searchClients API with default sort lobbyist_count_desc
- [ ] T014 [US1] Add total count fetching in src/pages/clients/index.astro using getClientCount API for pagination
- [ ] T015 [US1] Implement client cards grid in src/pages/clients/index.astro using ClientCard component with map over results
- [ ] T016 [US1] Add pagination controls in src/pages/clients/index.astro with Previous/Next buttons and page numbers (reuse pattern from src/pages/lobbyists/index.astro:194-252)
- [ ] T017 [US1] Add empty state message in src/pages/clients/index.astro when no clients found
- [ ] T018 [US1] Add Schema.org ItemList markup in src/pages/clients/index.astro for SEO with client organizations
- [ ] T019 [US1] Add subject area tag rendering in ClientCard.astro showing top 3 subjects with overflow indicator (+N more)
- [ ] T020 [US1] Add lobbyist count display in ClientCard.astro with proper pluralization (1 lobbyist vs N lobbyists)
- [ ] T021 [US1] Add clickable link wrapper in ClientCard.astro to navigate to /clients/[slug] detail page

**Checkpoint**: At this point, User Story 1 should be fully functional - /clients page displays, paginated directory works, clients sorted by count

---

## Phase 3: User Story 3 - View Individual Client Detail Page (Priority: P1)

**Goal**: Display full details for a single client with complete paginated lobbyist roster and Schema.org markup for SEO

**Independent Test**: Click any client from directory, verify detail page loads with client name, all subject areas, and full lobbyist list. Verify pagination for 20 lobbyists per page. Verify Schema.org markup present.

**Acceptance Criteria from Spec**:
- Client name, all subject areas, complete list of lobbyists
- Each lobbyist shows name, photo, subscription tier badge, subject areas
- Clickable lobbyist cards navigate to lobbyist profiles
- Pagination (20 lobbyists per page)
- Schema.org Organization markup for SEO

### Implementation for User Story 3

- [ ] T022 [P] [US3] Create client detail page at src/pages/clients/[slug].astro with dynamic slug parameter extraction
- [ ] T023 [US3] Add getClientBySlug data fetching in src/pages/clients/[slug].astro with slug from Astro.params
- [ ] T024 [US3] Add 404 redirect in src/pages/clients/[slug].astro when client not found
- [ ] T025 [US3] Add page parameter extraction in src/pages/clients/[slug].astro for lobbyist pagination (default 1)
- [ ] T026 [US3] Calculate lobbyist offset in src/pages/clients/[slug].astro based on page number (20 per page)
- [ ] T027 [US3] Add client header section in src/pages/clients/[slug].astro with client name and lobbyist count
- [ ] T028 [US3] Add subject areas display in src/pages/clients/[slug].astro showing all subjects as tags
- [ ] T029 [US3] Add lobbyist grid section in src/pages/clients/[slug].astro mapping over client.lobbyists.results
- [ ] T030 [US3] Create lobbyist cards in src/pages/clients/[slug].astro with name, photo, subscription tier badge, and subject areas
- [ ] T031 [US3] Add clickable links in src/pages/clients/[slug].astro wrapping lobbyist cards to navigate to /lobbyists/[lobbyist-slug]
- [ ] T032 [US3] Add pagination controls in src/pages/clients/[slug].astro for lobbyists with Previous/Next buttons
- [ ] T033 [US3] Add Schema.org Organization markup in src/pages/clients/[slug].astro with client name, URL, description, and knowsAbout subject areas
- [ ] T034 [US3] Add SEO metadata in src/pages/clients/[slug].astro with dynamic title and description including client name and lobbyist count

**Checkpoint**: At this point, User Story 3 should be fully functional - client detail pages load, lobbyist rosters display, Schema.org markup validates

---

## Phase 4: User Story 2 - Sort and Filter Clients (Priority: P2)

**Goal**: Enable users to filter clients by subject area and sort by different criteria (count, alphabetical)

**Independent Test**: Apply subject area filter, verify results update. Change sort order, verify re-ordering. Apply multiple filters with OR logic. Clear filters, verify reset to default.

**Acceptance Criteria from Spec**:
- Subject area filter shows only clients with lobbyists in selected areas
- Sort options: lobbyist count (high/low), alphabetical (A-Z, Z-A)
- Clear filters button resets to default view
- Multiple subject filters with OR logic
- Empty state message when no results

### Implementation for User Story 2

- [ ] T035 [P] [US2] Create ClientsFilter component at src/components/react/ClientsFilter.tsx with props for subjectAreas and initial values
- [ ] T036 [US2] Add subject area dropdown in ClientsFilter.tsx with multi-select support using existing shadcn/ui patterns
- [ ] T037 [US2] Add sort dropdown in ClientsFilter.tsx with options for lobbyist_count_desc, lobbyist_count_asc, name_asc, name_desc
- [ ] T038 [US2] Add URL update logic in ClientsFilter.tsx to navigate with updated query parameters on filter/sort change
- [ ] T039 [US2] Add Clear filters button in ClientsFilter.tsx that navigates to /clients with no query params
- [ ] T040 [US2] Update src/pages/clients/index.astro to extract subject and sort query parameters from URL
- [ ] T041 [US2] Update searchClients call in src/pages/clients/index.astro to pass subject filters and sort parameter
- [ ] T042 [US2] Add ClientsFilter component to src/pages/clients/index.astro with client:load hydration directive
- [ ] T043 [US2] Add active filters display in src/pages/clients/index.astro showing selected subjects with remove buttons (reuse pattern from src/pages/lobbyists/index.astro:127-162)
- [ ] T044 [US2] Update empty state message in src/pages/clients/index.astro to show "No clients found. Try adjusting your filters." when filters applied
- [ ] T045 [US2] Add subject area data fetching in src/pages/clients/index.astro from subject_areas table for filter options
- [ ] T046 [US2] Pass subject areas to ClientsFilter component in src/pages/clients/index.astro as props

**Checkpoint**: At this point, User Story 2 should be fully functional - filters work, sort options work, URL state persists, empty states display correctly

---

## Phase 5: User Story 4 - Navigate Between Browse Modes (Priority: P3)

**Goal**: Add navigation toggle between "Browse by Lobbyists" and "Browse by Clients" for easy mode switching

**Independent Test**: Visit /clients page, see toggle to "Browse by Lobbyists". Click toggle, navigate to /lobbyists. Visit /lobbyists page, see toggle to "Browse by Clients". Verify filters don't carry over.

**Acceptance Criteria from Spec**:
- Toggle/tab option on clients page to switch to "Browse by Lobbyists"
- Toggle/tab option on lobbyists page to switch to "Browse by Clients"
- Filters/sort don't carry over when switching modes (fresh state)

### Implementation for User Story 4

- [ ] T047 [P] [US4] Create BrowseModeToggle component at src/components/astro/BrowseModeToggle.astro with currentMode prop (clients or lobbyists)
- [ ] T048 [US4] Add tab/toggle UI in BrowseModeToggle.astro with two options: Browse by Lobbyists and Browse by Clients
- [ ] T049 [US4] Add active state styling in BrowseModeToggle.astro to highlight current mode
- [ ] T050 [US4] Add navigation links in BrowseModeToggle.astro pointing to /lobbyists and /clients (no query params)
- [ ] T051 [US4] Add BrowseModeToggle component to src/pages/clients/index.astro header with currentMode=clients
- [ ] T052 [US4] Add BrowseModeToggle component to src/pages/lobbyists/index.astro header with currentMode=lobbyists
- [ ] T053 [US4] Verify filter reset by testing navigation between modes clears all URL parameters

**Checkpoint**: At this point, User Story 4 should be fully functional - mode toggle displays, navigation works, filter state resets

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Performance optimization, SEO validation, accessibility improvements, and final testing

- [ ] T054 [P] Run EXPLAIN ANALYZE on get_clients_directory Postgres function to verify query performance (<2s for 5,000 clients)
- [ ] T055 [P] Run EXPLAIN ANALYZE on get_client_detail Postgres function to verify query performance
- [ ] T056 [P] Validate Schema.org markup using Google Rich Results Test for /clients/[slug] pages
- [ ] T057 [P] Test pagination with large datasets (>50 clients) to verify Previous/Next buttons and page numbers
- [ ] T058 [P] Test slug collision handling with duplicate client names (verify numeric suffix works)
- [ ] T059 [P] Test mobile responsive design on /clients and /clients/[slug] pages
- [ ] T060 [P] Test keyboard navigation on ClientsFilter component (tab through filters, Enter to apply)
- [ ] T061 [P] Add aria-labels to pagination controls for screen reader accessibility
- [ ] T062 [P] Add data-testid attributes to key elements (client-card, lobbyist-count) for future E2E tests
- [ ] T063 [P] Verify <2s page load time on /clients page with Chrome DevTools Performance tab
- [ ] T064 [P] Verify <500ms filter operations with Chrome DevTools Performance tab
- [ ] T065 [P] Run Lighthouse audit on /clients page (target: 90+ performance, accessibility, SEO scores)
- [ ] T066 [P] Verify edge cases: long client names (100+ chars), special characters in names, 15+ subject areas
- [ ] T067 Document feature in CLAUDE.md with links to /clients and /clients/[slug] examples

**Checkpoint**: All polish tasks complete - feature ready for production deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
  - Database migration MUST complete before any page implementation
  - API helpers MUST complete before any page implementation
- **User Stories (Phases 2-5)**: All depend on Setup (Phase 1) completion
  - User Story 1 (Phase 2) and User Story 3 (Phase 3) are independent P1 stories
  - User Story 2 (Phase 4) depends on User Story 1 (uses same directory page)
  - User Story 4 (Phase 5) depends on User Story 1 (adds toggle to directory page)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Setup (Phase 1) - No dependencies on other stories
- **User Story 3 (P1)**: Can start after Setup (Phase 1) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 - Enhances existing directory page with filters
- **User Story 4 (P3)**: Depends on User Story 1 - Adds navigation toggle to existing directory page

### Within Each User Story

- Setup: T001→T002→T003→T004→T005 (sequential migration steps), then T006-T009 (parallel API helpers)
- US1: T010 (ClientCard) parallel with T011-T021 (directory page implementation)
- US3: T022-T034 can proceed sequentially (single file, dynamic route)
- US2: T035-T039 (ClientsFilter component) parallel with T040-T046 (directory page updates)
- US4: T047-T050 (BrowseModeToggle) parallel with T051-T053 (page integration)
- Polish: All tasks T054-T067 can run in parallel (different files, different testing scopes)

### Parallel Opportunities

- **Phase 1 (Setup)**: T006, T007, T008, T009 (API helper functions - different functions in same file)
- **Phase 2 (US1)**: T010 (ClientCard component) parallel with T011 (directory page scaffold)
- **Phase 3 (US3)**: Mostly sequential (single file) but T022-T024 (page scaffold) parallel with T027-T028 (UI sections)
- **Phase 4 (US2)**: T035-T039 (ClientsFilter) parallel with T040-T046 (directory updates)
- **Phase 5 (US4)**: T047-T050 (BrowseModeToggle) parallel with T051-T052 (page integration)
- **Phase 6 (Polish)**: All tasks marked [P] can run in parallel (independent testing/validation)

---

## Parallel Example: User Story 1

```bash
# Launch ClientCard component and directory page scaffold together:
Task: "Create ClientCard component at src/components/astro/ClientCard.astro"
Task: "Create clients directory page at src/pages/clients/index.astro"

# After setup complete, all remaining US1 tasks run sequentially on same file (directory page)
```

---

## Parallel Example: User Story 2

```bash
# Launch ClientsFilter component and directory page updates together:
Task: "Create ClientsFilter component at src/components/react/ClientsFilter.tsx"
Task: "Update src/pages/clients/index.astro to extract subject and sort query parameters"

# Multiple developers can work on these in parallel (different files)
```

---

## Parallel Example: Polish Phase

```bash
# Launch all performance testing and validation tasks together:
Task: "Run EXPLAIN ANALYZE on get_clients_directory"
Task: "Run EXPLAIN ANALYZE on get_client_detail"
Task: "Validate Schema.org markup using Google Rich Results Test"
Task: "Test pagination with large datasets"
Task: "Test mobile responsive design"
Task: "Run Lighthouse audit on /clients page"

# All validation/testing tasks can run in parallel
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 3 Only - Both P1)

1. Complete Phase 1: Setup (Database + API helpers)
2. Complete Phase 2: User Story 1 (Browse Clients Directory)
3. **STOP and VALIDATE**: Test directory page independently
4. Complete Phase 3: User Story 3 (Client Detail Page)
5. **STOP and VALIDATE**: Test full flow (directory → detail → lobbyist profile)
6. Deploy/demo MVP with core functionality (P1 stories only)

**MVP Delivers**: Full reverse discovery flow - browse clients, view detail, click through to lobbyists

### Incremental Delivery

1. Complete Setup → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (directory only)
3. Add User Story 3 → Test independently → Deploy/Demo (complete P1 flow)
4. Add User Story 2 → Test independently → Deploy/Demo (enhanced filtering)
5. Add User Story 4 → Test independently → Deploy/Demo (navigation polish)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup together (Phase 1)
2. Once Setup is done:
   - Developer A: User Story 1 (P1) - Directory page
   - Developer B: User Story 3 (P1) - Detail page
3. After P1 stories complete:
   - Developer A: User Story 2 (P2) - Filtering (builds on US1)
   - Developer B: User Story 4 (P3) - Navigation toggle
4. Both developers run Polish tasks in parallel

---

## Notes

- [P] tasks = different files or independent operations, no blocking dependencies
- [Story] label maps task to specific user story for traceability and independent testing
- Each user story should be independently completable and testable
- Commit after each task or logical group (e.g., after completing ClientCard component)
- Stop at any checkpoint to validate story independently before proceeding
- Database migration (T001-T005) is CRITICAL path - all other work depends on it
- US1 and US3 are both P1 and can be worked on in parallel after Setup
- US2 enhances US1, so must complete US1 first
- US4 enhances US1, so must complete US1 first
- Performance targets: <2s page load, <500ms filter operations, 90+ Lighthouse scores
- SEO critical: Schema.org markup on client detail pages for "[Company Name] Texas lobbyist" ranking

---

## Task Summary

**Total Tasks**: 67
- Phase 1 (Setup): 9 tasks
- Phase 2 (US1 - Browse Directory): 12 tasks
- Phase 3 (US3 - Client Detail): 13 tasks
- Phase 4 (US2 - Filter/Sort): 12 tasks
- Phase 5 (US4 - Navigation Toggle): 7 tasks
- Phase 6 (Polish): 14 tasks

**By Priority**:
- P1 (US1 + US3): 25 implementation tasks
- P2 (US2): 12 implementation tasks
- P3 (US4): 7 implementation tasks

**Parallel Opportunities**: 21 tasks marked [P] can run concurrently with other tasks in same phase

**MVP Scope**: Phase 1 (Setup) + Phase 2 (US1) + Phase 3 (US3) = 34 tasks for full P1 delivery

**Independent Test Criteria**:
- US1: Navigate to /clients, see paginated client list sorted by lobbyist count
- US3: Click client, see detail page with full lobbyist roster and Schema.org markup
- US2: Apply subject filter, verify filtered results; change sort, verify re-ordering
- US4: See toggle on both pages, click to switch modes, verify filters reset

**Format Validation**: ✅ All tasks follow checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
