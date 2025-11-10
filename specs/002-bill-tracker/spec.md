# Feature Specification: Bill Tracker

**Feature Branch**: `002-bill-tracker`
**Created**: 2025-11-09
**Status**: Draft
**Input**: User description: "Add Texas legislative bill tracking feature for business owners and lobbyists"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Search and View Texas Legislative Bills (Priority: P1)

Business owners and lobbyists need to quickly find and view Texas legislative bills relevant to their interests. Users can search by bill number, subject area, author, keyword, or legislative session to discover bills that impact their business or clients.

**Why this priority**: This is the foundational capability that delivers immediate value. Without the ability to search and view bills, no other features can function. This establishes the bill tracker as a useful standalone tool.

**Independent Test**: Can be fully tested by searching for a known bill (e.g., "HB 1") and viewing its details. Delivers value by providing instant access to legislative information without visiting multiple government websites.

**Acceptance Scenarios**:

1. **Given** a user on the bill tracker page, **When** they search for a bill by number (e.g., "SB 123"), **Then** the system displays matching bills with title, author, status, and summary
2. **Given** a user searching bills, **When** they filter by subject area (e.g., "Healthcare"), **Then** the system displays all bills tagged with that subject area
3. **Given** a user viewing search results, **When** they select a specific bill, **Then** the system displays complete bill details including current status, text, amendments, votes, and hearing schedule
4. **Given** a user on the bill tracker, **When** they browse bills without entering search terms, **Then** the system displays recently filed bills in the current legislative session
5. **Given** a user searching for a bill, **When** they enter keywords (e.g., "renewable energy"), **Then** the system returns bills containing those keywords in title, summary, or full text, ranked by relevance

---

### User Story 2 - Save and Monitor Bills in Personal Watchlist (Priority: P2)

Users want to save important bills to a personal watchlist so they can quickly access bills they care about and monitor their progress through the legislative process.

**Why this priority**: Watchlists transform the bill tracker from a search tool into a personal legislative monitoring system. This increases user retention and engagement by creating personalized value. Users must be logged in, which encourages account creation.

**Independent Test**: Can be tested by logging in, searching for a bill, adding it to watchlist, then verifying it appears in the user's saved bills list. Delivers value by creating a personalized dashboard of relevant legislation.

**Acceptance Scenarios**:

1. **Given** a logged-in user viewing a bill, **When** they click "Add to Watchlist", **Then** the bill is saved to their personal watchlist and the button changes to "Remove from Watchlist"
2. **Given** a logged-in user, **When** they navigate to "My Watchlist", **Then** they see all saved bills with current status, sorted by most recently updated
3. **Given** a user with bills in their watchlist, **When** a bill's status changes (filed → committee hearing scheduled → passed committee → floor vote), **Then** the watchlist reflects the updated status
4. **Given** a logged-in user viewing their watchlist, **When** they click "Remove from Watchlist" on a bill, **Then** that bill is removed from their watchlist immediately
5. **Given** a non-logged-in user, **When** they attempt to add a bill to watchlist, **Then** they are prompted to log in or create an account

---

### User Story 3 - Receive Notifications on Bill Updates (Priority: P3)

Users want automatic notifications when bills in their watchlist have important status changes, so they don't have to manually check for updates and can respond quickly to legislative developments.

**Why this priority**: Notifications drive engagement and make the platform indispensable for users who need to stay informed about fast-moving legislation. This is a premium feature that justifies subscription revenue.

**Independent Test**: Can be tested by adding a bill to watchlist with notifications enabled, simulating a status change, and verifying notification delivery. Delivers value by providing proactive alerts without requiring users to check the platform daily.

**Acceptance Scenarios**:

1. **Given** a premium subscriber with bills in watchlist, **When** a tracked bill has a status change (e.g., scheduled for committee hearing), **Then** they receive a notification via email within 1 hour
2. **Given** a premium subscriber, **When** they configure notification preferences, **Then** they can choose which types of updates trigger notifications (filed, hearing scheduled, amended, voted on, passed, vetoed)
3. **Given** a free tier user with bills in watchlist, **When** a bill's status changes, **Then** they see an update indicator on their watchlist but do not receive email notifications
4. **Given** a premium subscriber with multiple tracked bills, **When** several bills update simultaneously, **Then** they receive a single digest notification summarizing all updates rather than separate emails for each
5. **Given** a premium subscriber, **When** they disable notifications for a specific bill, **Then** they stop receiving alerts for that bill but continue receiving alerts for other watchlist bills

---

### User Story 4 - Connect Bills to Lobbyist Expertise (Priority: P3)

Business owners searching for bills want to discover lobbyists who specialize in those specific legislative areas, while lobbyists want to showcase their expertise on relevant bills to attract clients.

**Why this priority**: This bridges the bill tracker with the core TexasLobby.org marketplace, creating a discovery pathway that drives lobbyist-client connections. This enhances the platform's unique value proposition beyond generic bill tracking tools.

**Independent Test**: Can be tested by viewing a bill and seeing a list of lobbyists who specialize in that subject area or have tagged the bill. Delivers value by connecting business owners to the right lobbyist at the moment they need help with specific legislation.

**Acceptance Scenarios**:

1. **Given** a user viewing a bill, **When** the bill page loads, **Then** the system displays lobbyists who have tagged this bill or specialize in the bill's subject area, ranked by subscription tier and relevance
2. **Given** a lobbyist with a premium or featured subscription, **When** they view a bill, **Then** they can tag it as part of their expertise area and add context notes visible to business owners
3. **Given** a business owner viewing a bill with multiple lobbyists tagged, **When** they review the lobbyist list, **Then** they see each lobbyist's name, firm, subject specialties, and how many bills they're tracking in this area
4. **Given** a business owner, **When** they click on a lobbyist from a bill page, **Then** they navigate to that lobbyist's full profile page
5. **Given** a free tier lobbyist, **When** they attempt to tag a bill, **Then** they are limited to tagging 5 bills maximum (enforced by system)

---

### User Story 5 - Lobbyists Add Context and Insights to Bills (Priority: P4)

Lobbyists want to add their analysis, context, and strategic insights to bills they're tracking, both to demonstrate expertise to potential clients and to provide value-added information beyond the raw legislative text.

**Why this priority**: This differentiates TexasLobby.org from government bill tracking sites by adding expert commentary. Lobbyists become content contributors, and business owners get interpreted information rather than just raw legislative data.

**Independent Test**: Can be tested by a lobbyist adding notes/analysis to a bill, then verifying those notes appear on the bill page for all users. Delivers value by providing insider perspective that helps business owners understand complex legislation.

**Acceptance Scenarios**:

1. **Given** a premium or featured tier lobbyist viewing a bill, **When** they add analysis notes, **Then** those notes appear on the bill page attributed to them with their name and firm
2. **Given** a business owner viewing a bill with lobbyist insights, **When** they read the insights, **Then** they see the lobbyist's analysis in plain language explaining the bill's business impact
3. **Given** multiple lobbyists adding insights to the same bill, **When** a user views the bill, **Then** all lobbyist insights are displayed, ordered by lobbyist subscription tier (featured first, then premium)
4. **Given** a lobbyist who has added insights to a bill, **When** the bill's status changes significantly (e.g., amended), **Then** they receive a notification prompting them to update their analysis
5. **Given** a business owner reading lobbyist insights, **When** they find the analysis helpful, **Then** they can click through to contact that lobbyist directly

---

### Edge Cases

- **What happens when a bill is withdrawn or dies in committee?** System marks bill status as "Dead" and notifies users tracking it, with option to keep or remove from watchlist
- **How does the system handle bills from past legislative sessions?** Users can search historical bills (last 5 sessions), but notifications only apply to current session bills
- **What if the external bill data source is unavailable or returns errors?** System displays cached bill data with timestamp showing last successful update, and retries sync every hour
- **How are bill duplicates or companion bills handled?** System identifies and links companion bills (same content, different chambers), showing relationship on bill detail page
- **What happens when a user exceeds their watchlist limit?** Free tier users limited to 10 bills. When attempting to add an 11th bill, system displays upgrade prompt. Premium users have unlimited watchlists.
- **How does the system handle bill amendments that significantly change content?** System tracks amendment history and highlights when major changes occur, triggering notifications for users tracking that bill
- **What if a lobbyist tags an irrelevant bill to game the system?** Users can flag inappropriate tags for review. Administrators review flagged content weekly. Lobbyists with repeated violations (3+ validated flags) have tag privileges suspended for 30 days.
- **How are special legislative sessions handled differently from regular sessions?** System tracks both regular and special sessions separately. Users can filter by session type. Notifications apply to both session types equally.
- **What happens to user watchlists when a legislative session ends?** Watchlists persist across sessions. Users can archive old session bills or keep them for reference. System prompts users to clear archived bills when new session begins.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to search Texas legislative bills by bill number, keyword, author name, and subject area
- **FR-002**: System MUST display bill search results within 2 seconds for searches returning up to 100 results
- **FR-003**: System MUST sync bill data from official Texas legislative data source at least once per day during active legislative sessions
- **FR-004**: System MUST display the following bill details: number, title, author(s), subject areas, current status, full text, fiscal notes, committee assignments, hearing schedule, votes, and amendments
- **FR-005**: System MUST allow logged-in users to add bills to a personal watchlist
- **FR-006**: System MUST allow logged-in users to remove bills from their watchlist
- **FR-007**: System MUST display a user's watchlist with bills sorted by most recently updated first
- **FR-008**: System MUST track bill status changes (filed, referred to committee, hearing scheduled, committee vote, floor calendar, floor vote, sent to other chamber, sent to governor, signed, vetoed)
- **FR-009**: System MUST send email notifications to premium subscribers within 1 hour when a tracked bill's status changes
- **FR-010**: System MUST allow premium subscribers to configure which status change types trigger notifications
- **FR-011**: System MUST enforce watchlist size limits: free tier limited to 10 bills, premium/featured tiers unlimited
- **FR-012**: System MUST display lobbyists associated with each bill, based on subject area expertise and manual bill tagging
- **FR-013**: System MUST allow premium and featured tier lobbyists to tag bills as part of their expertise area
- **FR-014**: System MUST allow premium and featured tier lobbyists to add context notes and analysis to bills they've tagged
- **FR-015**: System MUST display lobbyist insights on bill pages, ordered by subscription tier (featured, premium, free)
- **FR-016**: System MUST link bills to lobbyist profile pages for easy navigation
- **FR-017**: System MUST support filtering bills by legislative session (current and previous 5 sessions)
- **FR-018**: System MUST identify and link companion bills (same content filed in House and Senate)
- **FR-019**: System MUST track and display amendment history for bills
- **FR-020**: System MUST restrict bill tracking notifications to current legislative session only
- **FR-021**: System MUST handle API failures gracefully by displaying cached data with last-update timestamp
- **FR-022**: System MUST allow users to flag inappropriate lobbyist tags or insights for admin review
- **FR-023**: System MUST limit free tier lobbyists to tagging maximum 5 bills
- **FR-024**: System MUST allow unlimited bill tagging for premium and featured tier lobbyists
- **FR-025**: System MUST display bill status updates on user watchlists in real-time (or within 1 hour of sync)
- **FR-026**: System MUST provide digest notifications (single email summarizing multiple updates) when multiple tracked bills update within a 1-hour window
- **FR-027**: System MUST mark bills as "Dead" when withdrawn or killed in committee
- **FR-028**: System MUST distinguish between regular and special legislative sessions in bill data
- **FR-029**: System MUST prompt non-logged-in users to create account when attempting to use watchlist features
- **FR-030**: System MUST search bill full text, title, and summary when users enter keyword queries

### Key Entities

- **Bill**: Represents a piece of Texas legislation with attributes including bill number (e.g., "HB 123"), title, author(s), subject areas, status, filed date, full text, and legislative session. Links to amendments, votes, hearings, and lobbyists.

- **Bill Status**: Represents the current stage of a bill in the legislative process (filed, in committee, hearing scheduled, passed committee, on floor calendar, passed chamber, sent to governor, signed, vetoed, dead). Includes timestamp of status change.

- **Watchlist Entry**: Represents a user's saved bill with notification preferences. Links user to bill and includes attributes like date added, notification enabled (yes/no), and notification preferences (which status changes trigger alerts).

- **Bill Tag**: Represents a lobbyist's claim of expertise on a specific bill. Links lobbyist to bill and includes optional context notes/analysis provided by the lobbyist. Includes timestamp and edit history.

- **Bill Update**: Represents a historical record of status changes, amendments, or vote results for a bill. Used to trigger notifications and display bill history timeline.

- **Legislative Session**: Represents a Texas legislative session (regular or special) with start date, end date, session number, and session type. Bills belong to a session.

- **Subject Area**: Category for classifying bills (e.g., "Healthcare", "Energy", "Education"). Bills can have multiple subject areas. Lobbyists associate their expertise with subject areas.

- **Notification**: Represents an email notification sent to a user about a bill update. Includes bill, user, notification type (status change, amendment, vote), sent timestamp, and delivery status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find a specific bill by number in under 5 seconds from landing on the bill tracker page
- **SC-002**: Bill search returns relevant results in under 2 seconds for 95% of searches
- **SC-003**: Premium subscribers receive bill update notifications within 1 hour of status changes for 95% of updates during active legislative sessions
- **SC-004**: Users with tracked bills visit the platform at least 3x per week during active legislative sessions (vs. current average of 1x per week)
- **SC-005**: At least 70% of business owners who view bill details also click through to view associated lobbyist profiles
- **SC-006**: Premium subscription conversion rate increases by 25% among users who add bills to their watchlist (vs. users who don't use bill tracker)
- **SC-007**: Featured tier lobbyists who tag bills and add insights receive 40% more profile views than those who don't
- **SC-008**: System maintains 99.5% uptime during legislative sessions (January-May for regular sessions)
- **SC-009**: Bill data sync completes successfully at least once per day with less than 1% data discrepancy compared to official Texas Legislature source
- **SC-010**: At least 60% of users who search for a bill add it to their watchlist within the same session
- **SC-011**: Email notification open rates exceed 45% (indicating notifications are relevant and timely)
- **SC-012**: Average time for business owners to discover a relevant lobbyist reduces from 15 minutes to under 3 minutes when starting from a bill page

### Assumptions

- Texas Legislature provides a public API or data source for accessing bill information (if not, manual data entry workflow needed)
- Users already have accounts with defined subscription tiers (free, premium, featured) from existing TexasLobby.org platform
- Email delivery infrastructure (Resend) is already configured and operational
- Subject areas taxonomy already exists in the database from lobbyist profile system
- Legislative sessions follow predictable schedule (regular sessions January-May in odd-numbered years, special sessions as called)
- Companion bills can be identified by matching bill titles or through legislature metadata
- Free tier users are willing to upgrade to premium for notification features (key monetization assumption)
