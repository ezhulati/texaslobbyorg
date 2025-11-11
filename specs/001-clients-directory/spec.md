# Feature Specification: Browse by Clients Directory

**Feature Branch**: `001-clients-directory`
**Created**: 2025-11-11
**Status**: Draft
**Input**: User description: "Create a Browse by Clients directory page showing all clients (companies/organizations) registered with Texas lobbyists. Display each client with their name, industry/subject areas, and the number of lobbyists representing them. Enable sorting by lobbyist count for social proof. Clicking a client shows their full list of lobbyists. This provides reverse discovery (find lobbyists through their clients), market intelligence, transparency, and SEO value through company name pages."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse Clients Directory (Priority: P1)

A Texas business owner visits the "Browse by Clients" page to see which companies are actively represented by lobbyists. They want to understand who's lobbying and find lobbyists who work with similar companies in their industry.

**Why this priority**: Core value proposition - enables reverse discovery path and social proof. Without this, the feature has no value.

**Independent Test**: Can be fully tested by navigating to /clients page, viewing the list of clients with lobbyist counts, and verifying data accuracy. Delivers immediate value through transparency and discovery.

**Acceptance Scenarios**:

1. **Given** a user visits the /clients page, **When** the page loads, **Then** they see a list of all clients with company name, industry tags, and lobbyist count displayed
2. **Given** the clients list is displayed, **When** viewing the page, **Then** clients are sorted by lobbyist count (highest to lowest) by default
3. **Given** a client has multiple subject areas, **When** viewing the client card, **Then** up to 3 subject area tags are displayed with overflow indicator (e.g., "+5 more")
4. **Given** a client has zero lobbyists currently registered, **When** viewing the list, **Then** that client is not displayed in the directory

---

### User Story 2 - Sort and Filter Clients (Priority: P2)

A business owner wants to narrow down the client list to find companies in their specific industry or sort by different criteria to find the most or least represented companies.

**Why this priority**: Enhances discoverability and user experience but the feature is usable without it. Essential for scaling beyond small datasets.

**Independent Test**: Can be tested by applying filters (subject area) and sort options (alphabetical, lobbyist count), verifying the list updates correctly. Delivers value through improved findability.

**Acceptance Scenarios**:

1. **Given** the clients directory is displayed, **When** the user selects a subject area filter (e.g., "Healthcare"), **Then** only clients working with lobbyists in that subject area are shown
2. **Given** the clients directory is displayed, **When** the user changes sort to "Alphabetical (A-Z)", **Then** clients are re-ordered alphabetically by company name
3. **Given** filters are applied, **When** the user clicks "Clear filters", **Then** the full client list returns with default sorting
4. **Given** a user applies multiple subject area filters, **When** viewing results, **Then** clients matching ANY of the selected subject areas are shown (OR logic)
5. **Given** search results return zero clients, **When** viewing the page, **Then** a helpful message displays: "No clients found. Try adjusting your filters."

---

### User Story 3 - View Individual Client Detail Page (Priority: P1)

A business owner clicks on a client name to see the full list of lobbyists representing that company, along with client details and context about their lobbying activity.

**Why this priority**: Completes the reverse discovery flow. Without this, users can't act on the information from the directory. Critical for SEO value.

**Independent Test**: Can be tested by clicking any client from the directory, viewing their dedicated page with full lobbyist list, and verifying all data displays correctly. Delivers value through detailed insights and lobbyist discovery.

**Acceptance Scenarios**:

1. **Given** a user clicks a client name from the directory, **When** the client detail page loads, **Then** they see the client name, all subject areas, and complete list of lobbyists representing them
2. **Given** a client detail page is displayed, **When** viewing the lobbyist list, **Then** each lobbyist shows their name, photo, subscription tier badge, and primary subject areas
3. **Given** a user views a lobbyist on the client detail page, **When** they click the lobbyist's name or card, **Then** they navigate to that lobbyist's full profile page
4. **Given** a client has 10+ lobbyists, **When** viewing the client page, **Then** lobbyists are displayed with pagination (20 per page)
5. **Given** a client detail page, **When** the page loads, **Then** structured data (Schema.org Organization markup) is included for SEO

---

### User Story 4 - Navigate Between Browse Modes (Priority: P3)

A user wants to switch between browsing by lobbyists (existing feature) and browsing by clients to explore different discovery paths.

**Why this priority**: Nice-to-have navigation enhancement. Users can still access both pages through other means (footer links, search, etc.).

**Independent Test**: Can be tested by adding navigation links between browse modes and verifying they work correctly. Delivers incremental UX improvement.

**Acceptance Scenarios**:

1. **Given** a user is on the clients directory page, **When** viewing the page header, **Then** they see a toggle or tab option to switch to "Browse by Lobbyists"
2. **Given** a user is on the main lobbyist directory page, **When** viewing the page header, **Then** they see a toggle or tab option to switch to "Browse by Clients"
3. **Given** a user switches between browse modes, **When** navigating, **Then** their previous filters/sort preferences do not carry over (fresh state)

---

### Edge Cases

- What happens when a client name is very long (100+ characters)? Truncate with ellipsis and show full name on hover/detail page.
- How does the system handle clients with identical or very similar names? Display additional context (e.g., city/headquarters if available) to differentiate.
- What happens when a client has lobbyists across many different subject areas (15+)? Show top 3 most common subjects with "+12 more" indicator.
- How does the system handle special characters or non-English characters in client names? Display correctly using UTF-8 encoding, sort appropriately.
- What happens if the client-lobbyist relationship data is stale or outdated? Display data "as of [last_updated date]" notice on pages.
- How does the system handle very large datasets (10,000+ clients)? Implement pagination (50 clients per page) and consider search functionality.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a paginated list of all clients from the database who have at least one associated lobbyist
- **FR-002**: System MUST show for each client: company name, count of lobbyists representing them, and up to 3 primary subject areas
- **FR-003**: System MUST sort clients by lobbyist count (descending) as the default view
- **FR-004**: System MUST provide sort options: lobbyist count (high to low), lobbyist count (low to high), alphabetical (A-Z), alphabetical (Z-A)
- **FR-005**: System MUST provide filter options by subject area (multi-select with OR logic)
- **FR-006**: System MUST create individual detail pages for each client at URL pattern /clients/[client-slug]
- **FR-007**: Client detail pages MUST display: client name, all subject areas, complete list of associated lobbyists with their profiles
- **FR-008**: Client detail pages MUST include Schema.org Organization structured data for SEO
- **FR-009**: System MUST generate SEO-friendly slugs for client names (e.g., "AT&T" becomes "att", "H-E-B" becomes "heb")
- **FR-010**: System MUST handle pagination for large client lists (50 clients per page on directory, 20 lobbyists per page on client detail)
- **FR-011**: System MUST display lobbyist subscription tier badges (Featured, Premium, Free) on client detail pages
- **FR-012**: System MUST exclude clients with zero current lobbyist relationships from the directory
- **FR-013**: System MUST provide "Clear filters" functionality to reset to default view
- **FR-014**: System MUST display helpful empty state messages when filters return no results
- **FR-015**: System MUST make client names clickable links to their detail pages throughout the interface

### Key Entities

- **Client**: Represents a company or organization registered with Texas lobbyists. Key attributes: name, slug (URL-friendly), subject areas (derived from associated lobbyists), lobbyist count (derived), active status. Relationships: Many-to-many with Lobbyists through existing database schema.
- **Lobbyist**: Existing entity. Relationship: Many-to-many with Clients. Used to populate client detail pages and calculate lobbyist counts.
- **Subject Area**: Existing entity representing policy/industry categories. Relationship: Associated with both Lobbyists and Clients (through lobbyist relationships). Used for filtering and categorization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can navigate from clients directory to a specific lobbyist profile in 3 clicks or fewer
- **SC-002**: Clients directory page loads with full data in under 2 seconds for datasets up to 5,000 clients
- **SC-003**: At least 30% of users who view client detail pages click through to view at least one lobbyist profile
- **SC-004**: Client detail pages rank on Google's first page for "[Company Name] Texas lobbyist" searches within 90 days of launch for top 100 clients by lobbyist count
- **SC-005**: Zero data accuracy complaints about client-lobbyist relationships within first 30 days (validates public record data quality)
- **SC-006**: Filter and sort operations complete in under 500 milliseconds for 95% of requests
- **SC-007**: The clients directory accounts for at least 15% of total site page views within 60 days of launch

## Assumptions

1. **Data Source**: Client-lobbyist relationship data exists in the current database schema (`clients` table with relationships to `lobbyists` table) and is accurate/up-to-date based on Texas Ethics Commission public records
2. **Client Identification**: Clients are uniquely identifiable by name, and the existing slug generation logic will handle duplicate names appropriately
3. **Subject Area Attribution**: A client's subject areas are derived from their associated lobbyists' subject areas (inherited relationship)
4. **Active Relationships Only**: Only current/active lobbyist-client relationships are displayed; historical/expired registrations are excluded
5. **Lobbyist Count**: Calculated dynamically from active relationships, not stored as a separate field
6. **URL Structure**: Client detail pages follow pattern `/clients/[slug]` and do not conflict with existing routes
7. **Navigation Integration**: This feature adds a new browse mode but does not replace existing lobbyist-first navigation
8. **Public Information**: All displayed data is public record and legally permissible to display without client consent
9. **Schema.org Markup**: Organization schema is appropriate and sufficient for SEO goals (alternative: LocalBusiness schema not required)
10. **Performance Baseline**: Current database query performance supports this feature without requiring caching layer (can be added later if needed)

## Out of Scope

- Client profiles beyond basic information (no contact info, headquarters address, company descriptions unless already in database)
- Client authentication or claim/edit functionality (future feature)
- Historical lobbying data or timeline views
- Lobbyist-to-client relationship strength indicators or spending data
- Client comparison features
- Email alerts for new clients or lobbyist changes
- Advanced search functionality (keyword search within client names) - only filtering by subject area
- Geographic filtering (by city/region) - only subject area filtering
- Mobile app versions (responsive web only)
- Export functionality (CSV, PDF downloads of client lists)
