# Tasks: Bill Tracker

**Input**: Design documents from `/specs/002-bill-tracker/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is an existing Astro SSR web application. Paths follow the structure defined in plan.md:
- **Components**: `src/components/astro/bills/` and `src/components/react/bills/`
- **Services**: `src/lib/services/`
- **API Routes**: `src/pages/api/bills/`
- **Pages**: `src/pages/bills/`
- **Database**: `supabase/migrations/`
- **Scripts**: `scripts/`
- **Scheduled Jobs**: `netlify/functions/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and configure bill tracker infrastructure

- [ ] T001 [P] Install FTP client dependency: `npm install basic-ftp`
- [ ] T002 [P] Install HTML parser dependency: `npm install cheerio @types/cheerio`
- [ ] T003 [P] Update package.json with new scripts for bill sync and notifications
- [ ] T004 [P] Create TypeScript types file for bill tracker at src/lib/types/bills.ts
- [ ] T005 Configure environment variables in .env.example for FTP and Resend (if not already present)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core database schema and functions that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create database migration file at supabase/migrations/YYYYMMDDHHMMSS_add_bill_tracker_schema.sql
- [ ] T007 Add legislative_sessions table to migration file
- [ ] T008 Add bills table with full-text search (tsvector + GIN index) to migration file
- [ ] T009 Add bill_updates table to migration file
- [ ] T010 Add watchlist_entries table with RLS policies to migration file
- [ ] T011 Add bill_tags table with RLS policies to migration file
- [ ] T012 Add notifications table with RLS policies to migration file
- [ ] T013 Create search_bills() database function in migration file
- [ ] T014 Create get_user_watchlist() database function in migration file
- [ ] T015 Create update_updated_at_column() trigger function in migration file
- [ ] T016 Apply database migration: `npm run db:push`
- [ ] T017 Regenerate TypeScript types from Supabase: `npx supabase gen types typescript --local > src/lib/database.types.ts`
- [ ] T018 [P] Create sample legislative session seed data at scripts/seed-legislative-sessions.ts
- [ ] T019 [P] Create sample bills seed data at scripts/seed-bills.ts
- [ ] T020 Run seed scripts to populate test data for development

**Checkpoint**: Foundation ready - database schema complete, types generated, sample data loaded. User story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Search and View Texas Legislative Bills (Priority: P1) 🎯 MVP

**Goal**: Enable users to search for Texas bills by number, keyword, author, or subject area, and view complete bill details including status, text, and history.

**Independent Test**: Search for a bill by number (e.g., "HB 1"), view search results, click on a bill to see full details including status, author, and full text.

### Implementation for User Story 1

#### Core Services & API Helpers

- [ ] T021 [P] [US1] Create bill search helper functions at src/lib/api/bills.ts
- [ ] T022 [P] [US1] Create bill search query builder service at src/lib/services/billSearch.ts

#### API Routes

- [ ] T023 [P] [US1] Implement GET /api/bills/search endpoint at src/pages/api/bills/search.ts
- [ ] T024 [P] [US1] Implement GET /api/bills/[id].ts endpoint for bill details by ID
- [ ] T025 [P] [US1] Implement GET /api/bills/slug/[slug].ts endpoint for bill details by slug
- [ ] T026 [P] [US1] Implement GET /api/bills/[id]/updates.ts endpoint for bill update history
- [ ] T027 [P] [US1] Implement POST /api/bills/[id]/increment-views.ts endpoint for view tracking

#### Astro Components (Server-rendered)

- [ ] T028 [P] [US1] Create BillCard component at src/components/astro/bills/BillCard.astro
- [ ] T029 [P] [US1] Create BillStatusBadge component at src/components/astro/bills/BillStatusBadge.astro
- [ ] T030 [P] [US1] Create BillDetailLayout component at src/components/astro/bills/BillDetailLayout.astro
- [ ] T031 [P] [US1] Create BillUpdateTimeline component at src/components/astro/bills/BillUpdateTimeline.astro

#### React Components (Interactive Islands)

- [ ] T032 [P] [US1] Create BillSearchFilter component at src/components/react/bills/BillSearchFilter.tsx
- [ ] T033 [P] [US1] Create BillPagination component at src/components/react/bills/BillPagination.tsx

#### Pages

- [ ] T034 [US1] Create bill search/browse page at src/pages/bills/index.astro (depends on T028, T029, T032)
- [ ] T035 [US1] Create bill detail page at src/pages/bills/[slug].astro (depends on T030, T031)
- [ ] T036 [US1] Update site header navigation to include link to /bills page in src/components/astro/Header.astro

#### Integration & Polish

- [ ] T037 [US1] Add error handling for bills not found in bill detail page
- [ ] T038 [US1] Add loading states to BillSearchFilter component
- [ ] T039 [US1] Implement view count increment on bill detail page view

**Checkpoint**: At this point, users can search for bills and view bill details. User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Save and Monitor Bills in Personal Watchlist (Priority: P2)

**Goal**: Enable logged-in users to save bills to a personal watchlist for easy access and monitoring, with enforcement of tier limits (free: 10 bills, premium: unlimited).

**Independent Test**: Log in, search for a bill, add it to watchlist, navigate to /bills/watchlist to see saved bills, remove a bill from watchlist.

### Implementation for User Story 2

#### API Routes

- [ ] T040 [P] [US2] Implement GET /api/bills/watchlist.ts endpoint to get user's watchlist
- [ ] T041 [P] [US2] Implement POST /api/bills/watchlist.ts endpoint to add bill to watchlist
- [ ] T042 [P] [US2] Implement DELETE /api/bills/watchlist/[id].ts endpoint to remove from watchlist
- [ ] T043 [P] [US2] Implement PATCH /api/bills/watchlist/[id].ts endpoint to update notification preferences
- [ ] T044 [P] [US2] Implement GET /api/bills/watchlist/stats.ts endpoint for watchlist statistics

#### React Components (Interactive)

- [ ] T045 [P] [US2] Create BillWatchlistButton component at src/components/react/bills/BillWatchlistButton.tsx
- [ ] T046 [P] [US2] Create WatchlistBillCard component at src/components/react/bills/WatchlistBillCard.tsx
- [ ] T047 [P] [US2] Create WatchlistStats component at src/components/react/bills/WatchlistStats.tsx

#### Pages

- [ ] T048 [US2] Create watchlist page at src/pages/bills/watchlist.astro (depends on T046, T047)

#### Integration with User Story 1

- [ ] T049 [US2] Add BillWatchlistButton to bill detail page (src/pages/bills/[slug].astro)
- [ ] T050 [US2] Add BillWatchlistButton to bill search results (src/components/astro/bills/BillCard.astro)

#### Tier Limit Enforcement

- [ ] T051 [US2] Implement watchlist size limit check in POST /api/bills/watchlist.ts (free tier: 10 bills)
- [ ] T052 [US2] Display upgrade prompt when free user exceeds watchlist limit in BillWatchlistButton

#### Error Handling & Polish

- [ ] T053 [US2] Add authentication check and redirect to login for non-authenticated users
- [ ] T054 [US2] Add optimistic UI updates to BillWatchlistButton (show change immediately)
- [ ] T055 [US2] Handle duplicate bill additions gracefully in watchlist API

**Checkpoint**: At this point, logged-in users can save bills to their watchlist and view them on the watchlist page. User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Receive Notifications on Bill Updates (Priority: P3)

**Goal**: Premium subscribers receive email notifications when tracked bills have status changes, with configurable preferences and digest options.

**Independent Test**: Add a bill to watchlist with notifications enabled (as premium user), simulate a bill status change, verify email notification is sent within 1 hour.

### Implementation for User Story 3

#### Notification Service

- [ ] T056 [P] [US3] Create notification service at src/lib/services/notifications.ts
- [ ] T057 [P] [US3] Create email template for individual bill notifications
- [ ] T058 [P] [US3] Create email template for digest notifications
- [ ] T059 [P] [US3] Implement notification queue and batching logic in notification service

#### Bill Update Detection

- [ ] T060 [P] [US3] Create bill update detection script at scripts/detect-bill-updates.ts
- [ ] T061 [P] [US3] Implement logic to create bill_update records when status changes

#### Scheduled Jobs

- [ ] T062 [US3] Create scheduled notification job at netlify/functions/scheduled-notifications.ts (depends on T056)
- [ ] T063 [US3] Configure Netlify scheduled function to run hourly in netlify.toml

#### Notification Preferences UI

- [ ] T064 [P] [US3] Create NotificationPreferences component at src/components/react/bills/NotificationPreferences.tsx
- [ ] T065 [US3] Add notification preferences to watchlist page (update src/pages/bills/watchlist.astro)

#### Integration

- [ ] T066 [US3] Add subscription tier check to notification sending (premium/featured only)
- [ ] T067 [US3] Implement digest mode vs immediate notification logic
- [ ] T068 [US3] Create notification log entries in notifications table

#### Testing & Polish

- [ ] T069 [US3] Create test script for notification sending at scripts/test-notifications.ts
- [ ] T070 [US3] Add error handling for failed email delivery
- [ ] T071 [US3] Implement notification delivery status tracking with Resend webhooks

**Checkpoint**: Premium subscribers receive email notifications when their tracked bills update. All user stories 1, 2, and 3 work independently.

---

## Phase 6: User Story 4 - Connect Bills to Lobbyist Expertise (Priority: P3)

**Goal**: Display lobbyists who specialize in a bill's subject area or have tagged the bill, creating a discovery pathway from bills to lobbyists.

**Independent Test**: View a bill detail page and see a list of lobbyists who specialize in that bill's subject area, click on a lobbyist to navigate to their profile.

### Implementation for User Story 4

#### API Routes

- [ ] T072 [P] [US4] Implement GET /api/bills/[id]/lobbyists.ts endpoint to get associated lobbyists

#### Components

- [ ] T073 [P] [US4] Create BillLobbyistList component at src/components/astro/bills/BillLobbyistList.astro
- [ ] T074 [P] [US4] Create LobbyistExpertiseCard component at src/components/astro/bills/LobbyistExpertiseCard.astro

#### Integration with User Story 1

- [ ] T075 [US4] Add BillLobbyistList to bill detail page (src/pages/bills/[slug].astro) (depends on T073, T074)
- [ ] T076 [US4] Implement lobbyist ranking logic (subscription tier > relevance) in API endpoint

#### Subject Area Matching

- [ ] T077 [US4] Create service to match bills to lobbyists by subject_areas at src/lib/services/billLobbyistMatcher.ts
- [ ] T078 [US4] Display lobbyist subject specialties on LobbyistExpertiseCard

**Checkpoint**: Bill detail pages now display relevant lobbyists, connecting the bill tracker to the marketplace.

---

## Phase 7: User Story 5 - Lobbyists Add Context and Insights to Bills (Priority: P4)

**Goal**: Premium/featured lobbyists can tag bills and add analysis/insights to demonstrate expertise and provide value to business owners.

**Independent Test**: Log in as premium lobbyist, view a bill, tag it, add insights, verify insights appear on the bill page for all users.

### Implementation for User Story 5

#### API Routes

- [ ] T079 [P] [US5] Implement GET /api/bills/tags.ts endpoint to get lobbyist's tagged bills
- [ ] T080 [P] [US5] Implement POST /api/bills/tags.ts endpoint to tag a bill
- [ ] T081 [P] [US5] Implement PATCH /api/bills/tags/[id].ts endpoint to update bill insights
- [ ] T082 [P] [US5] Implement DELETE /api/bills/tags/[id].ts endpoint to remove tag
- [ ] T083 [P] [US5] Implement POST /api/bills/tags/flag/[id].ts endpoint to flag inappropriate tags
- [ ] T084 [P] [US5] Implement GET /api/bills/[bill_id]/tags.ts endpoint to get all tags for a bill

#### React Components

- [ ] T085 [P] [US5] Create BillTagManager component at src/components/react/bills/BillTagManager.tsx
- [ ] T086 [P] [US5] Create LobbyistInsightsDisplay component at src/components/astro/bills/LobbyistInsightsDisplay.astro

#### Integration with Bill Detail Page

- [ ] T087 [US5] Add BillTagManager to bill detail page for lobbyists (src/pages/bills/[slug].astro)
- [ ] T088 [US5] Add LobbyistInsightsDisplay to bill detail page to show all insights (depends on T086)

#### Tier Limit Enforcement

- [ ] T089 [US5] Implement bill tag limit check in POST /api/bills/tags.ts (free tier: 5 bills, premium: unlimited)
- [ ] T090 [US5] Display upgrade prompt when free lobbyist exceeds tag limit

#### Lobbyist Notifications

- [ ] T091 [US5] Add notification for lobbyists when their tagged bills are amended (update scripts/detect-bill-updates.ts)

#### Polish

- [ ] T092 [US5] Add rich text editor for lobbyist insights (markdown support)
- [ ] T093 [US5] Display last updated timestamp for insights
- [ ] T094 [US5] Implement flagging UI for inappropriate tags (admin review queue)

**Checkpoint**: Lobbyists can now tag bills and provide insights, all 5 user stories are functional.

---

## Phase 8: Data Sync Infrastructure (Background Jobs)

**Purpose**: Automated daily synchronization of bill data from Texas Legislature FTP

**Note**: This runs independently of user-facing features but populates the database they depend on.

### FTP Sync Service

- [ ] T095 [P] Create FTP connection service at src/lib/services/ftpClient.ts
- [ ] T096 [P] Create bill HTML/TXT parser service at src/lib/services/billParser.ts
- [ ] T097 [P] Create bill sync orchestration service at src/lib/services/billSync.ts

### Sync Scripts

- [ ] T098 Create manual FTP sync script at scripts/sync-bills.ts (depends on T095, T096, T097)
- [ ] T099 [P] Create FTP connection test script at scripts/test-ftp-connection.ts
- [ ] T100 [P] Add command-line arguments to sync-bills.ts (--session, --dry-run, --bill, --verbose)

### Scheduled Jobs

- [ ] T101 Create scheduled bill sync job at netlify/functions/scheduled-bill-sync.ts (depends on T098)
- [ ] T102 Configure Netlify scheduled function for daily sync at 2 AM CST in netlify.toml

### Bill Update Detection

- [ ] T103 Update bill sync service to detect status changes and create bill_update records
- [ ] T104 Implement companion bill detection logic in bill sync service

### Error Handling & Logging

- [ ] T105 Add retry logic for FTP connection failures (3 retries with exponential backoff)
- [ ] T106 Add error logging for failed bill parsing (skip file, continue sync)
- [ ] T107 Create sync log table in database to track sync status and errors
- [ ] T108 Add admin notification for sync failures (email to admin)

**Checkpoint**: Bill data automatically syncs daily from Texas Legislature FTP.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall system quality

### Error Handling & User Experience

- [ ] T109 [P] Add global error boundary for React components
- [ ] T110 [P] Create custom 404 page for bills not found at src/pages/bills/404.astro
- [ ] T111 [P] Add loading skeletons for all async components
- [ ] T112 Add toast notifications for user actions (bill added to watchlist, etc.)

### Performance Optimization

- [ ] T113 [P] Add database query optimization for bill search (EXPLAIN ANALYZE)
- [ ] T114 [P] Implement pagination caching for bill search results
- [ ] T115 [P] Add lazy loading for bill full text (load on demand)
- [ ] T116 Optimize images and assets for bill pages

### Accessibility

- [ ] T117 [P] Add ARIA labels to interactive bill tracker components
- [ ] T118 [P] Ensure keyboard navigation works for bill search and watchlist
- [ ] T119 [P] Add screen reader announcements for dynamic updates

### Documentation & Testing

- [ ] T120 [P] Update quickstart.md with actual setup steps (already created, may need revisions)
- [ ] T121 [P] Create API documentation from OpenAPI contracts
- [ ] T122 [P] Add inline code comments for complex bill sync logic
- [ ] T123 Run through quickstart.md validation steps

### Security Hardening

- [ ] T124 [P] Audit RLS policies for all bill tracker tables
- [ ] T125 [P] Add rate limiting to bill search API endpoint
- [ ] T126 [P] Sanitize HTML from bill text before display (prevent XSS)

### Analytics & Monitoring

- [ ] T127 [P] Add analytics tracking for bill searches and views
- [ ] T128 [P] Set up monitoring alerts for sync job failures
- [ ] T129 [P] Create admin dashboard for bill tracker statistics

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational (Phase 2) - Integrates with US1 but independently testable
- **User Story 3 (Phase 5)**: Depends on Foundational (Phase 2) AND User Story 2 (requires watchlist)
- **User Story 4 (Phase 6)**: Depends on Foundational (Phase 2) AND User Story 1 (integrates with bill detail page)
- **User Story 5 (Phase 7)**: Depends on Foundational (Phase 2) AND User Story 1 AND User Story 4 (builds on lobbyist display)
- **Data Sync (Phase 8)**: Depends on Foundational (Phase 2) - Can run in parallel with user stories
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Search and View**: ✅ Independent - can start after Foundational
- **User Story 2 (P2) - Watchlist**: Integrates with US1 but independently testable
- **User Story 3 (P3) - Notifications**: Depends on US2 (requires watchlist to exist)
- **User Story 4 (P3) - Lobbyist Connection**: Integrates with US1 but independently testable
- **User Story 5 (P4) - Lobbyist Insights**: Depends on US1 and US4 (extends lobbyist display)

### Within Each User Story

- Services and API helpers before API routes
- Components before pages
- Core implementation before integration
- Independent functionality before cross-story integration

### Parallel Opportunities

- **Setup tasks**: All marked [P] can run in parallel (T001-T005)
- **Foundational tasks**: Some marked [P] can run in parallel (seed scripts)
- **Within User Stories**: Tasks marked [P] can run in parallel (components, API routes)
- **Data Sync**: Can run in parallel with user story implementation
- **Polish tasks**: Most marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all API routes for User Story 1 together:
Task: "Implement GET /api/bills/search endpoint at src/pages/api/bills/search.ts"
Task: "Implement GET /api/bills/[id].ts endpoint for bill details by ID"
Task: "Implement GET /api/bills/slug/[slug].ts endpoint for bill details by slug"
Task: "Implement GET /api/bills/[id]/updates.ts endpoint for bill update history"
Task: "Implement POST /api/bills/[id]/increment-views.ts endpoint for view tracking"

# Launch all Astro components for User Story 1 together:
Task: "Create BillCard component at src/components/astro/bills/BillCard.astro"
Task: "Create BillStatusBadge component at src/components/astro/bills/BillStatusBadge.astro"
Task: "Create BillDetailLayout component at src/components/astro/bills/BillDetailLayout.astro"
Task: "Create BillUpdateTimeline component at src/components/astro/bills/BillUpdateTimeline.astro"

# Launch all React components for User Story 1 together:
Task: "Create BillSearchFilter component at src/components/react/bills/BillSearchFilter.tsx"
Task: "Create BillPagination component at src/components/react/bills/BillPagination.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Fastest path to value**:

1. Complete Phase 1: Setup (T001-T005) - ~30 minutes
2. Complete Phase 2: Foundational (T006-T020) - ~4 hours (database migration + seed data)
3. Complete Phase 3: User Story 1 (T021-T039) - ~8 hours
4. **STOP and VALIDATE**: Test bill search and detail pages independently
5. Deploy/demo MVP: Users can search and view Texas bills

**MVP delivers**:
- Bill search by keyword, number, author, subject
- Bill detail pages with full information
- ~10,000 bills searchable
- No login required
- Standalone value before adding watchlists or notifications

### Incremental Delivery

**Recommended build order**:

1. **Week 1: Foundation + MVP (US1)**
   - Complete Setup + Foundational → Database ready with sample data
   - Complete User Story 1 → Deploy searchable bill database (MVP!)
   - Users can immediately start using bill tracker

2. **Week 2: Personalization (US2)**
   - Complete User Story 2 → Users can save bills to watchlist
   - Drives account creation and engagement

3. **Week 3: Premium Features (US3)**
   - Complete User Story 3 → Premium subscribers get notifications
   - Monetization feature ready

4. **Week 4: Marketplace Integration (US4, US5)**
   - Complete User Story 4 → Bills connect to lobbyists
   - Complete User Story 5 → Lobbyists add insights
   - Full marketplace integration complete

5. **Ongoing: Data Sync (Phase 8)**
   - Implement in parallel with user stories
   - Can be tested with manual runs initially
   - Automate once data model is stable

### Parallel Team Strategy

With 2-3 developers:

1. **Week 1**: Team completes Setup + Foundational together
2. **Week 2 (post-foundation)**:
   - Developer A: User Story 1 (Search & View)
   - Developer B: Data Sync Infrastructure (Phase 8)
3. **Week 3**:
   - Developer A: User Story 2 (Watchlist)
   - Developer B: User Story 3 (Notifications)
4. **Week 4**:
   - Developer A: User Story 4 (Lobbyist Connection)
   - Developer B: User Story 5 (Lobbyist Insights)
5. **Week 5**: Polish & Cross-Cutting (Phase 9)

---

## Task Summary

**Total Tasks**: 129

**By Phase**:
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 15 tasks
- Phase 3 (User Story 1): 19 tasks
- Phase 4 (User Story 2): 16 tasks
- Phase 5 (User Story 3): 16 tasks
- Phase 6 (User Story 4): 7 tasks
- Phase 7 (User Story 5): 16 tasks
- Phase 8 (Data Sync): 14 tasks
- Phase 9 (Polish): 21 tasks

**By User Story**:
- US1 (Search & View): 19 tasks
- US2 (Watchlist): 16 tasks
- US3 (Notifications): 16 tasks
- US4 (Lobbyist Connection): 7 tasks
- US5 (Lobbyist Insights): 16 tasks
- Infrastructure: 55 tasks (Setup, Foundational, Data Sync, Polish)

**Parallel Opportunities**: 78 tasks marked [P] can run in parallel with other tasks in their phase

**Independent Test Criteria**:
- US1: Search for "HB 1", view bill details, see status and full text
- US2: Log in, add bill to watchlist, view watchlist page, remove bill
- US3: Enable notifications (premium), simulate status change, verify email sent
- US4: View bill detail, see lobbyist list, click lobbyist to visit profile
- US5: Log in as lobbyist, tag bill, add insights, see insights on bill page

**Suggested MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only) = 39 tasks

---

## Notes

- [P] tasks = different files, no dependencies within that phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently before proceeding
- Data Sync (Phase 8) can run in parallel with user story development
- Tests not included as spec does not explicitly request TDD approach
- All file paths are relative to repository root
- RLS policies ensure data privacy and security at database level
- Tier limits (watchlist size, bill tagging) enforced at application layer
