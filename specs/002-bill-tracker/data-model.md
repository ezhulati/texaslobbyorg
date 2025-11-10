# Data Model: Bill Tracker

**Date**: 2025-11-09
**Purpose**: Database schema design for Texas legislative bill tracking feature

## Overview

The bill tracker data model extends the existing TexasLobby.org database with 6 new tables and 1 new enum type. It integrates with existing `users`, `lobbyists`, and `subject_areas` tables.

**Design Principles**:
- All tables use UUID primary keys (existing pattern)
- RLS (Row Level Security) enabled for user privacy
- Full-text search via PostgreSQL `tsvector`
- Timestamps for sync tracking and audit trails
- Foreign keys enforce referential integrity

## Entity Relationship Diagram

```
┌─────────────────────┐
│ legislative_sessions│
└─────────────────────┘
          │ 1
          │
          │ N
┌─────────────────────┐       N ┌──────────────────────┐
│       bills         │◄────────┤    bill_updates      │
│  - full_text_search │         │  (status change log) │
└─────────────────────┘         └──────────────────────┘
    │ N           │ N
    │             │
    │ 1           │ 1
    │             │
    │         ┌───────────────┐
    │         │   bill_tags   │
    │         │  (lobbyist    │
    │         │   expertise)  │
    │         └───────────────┘
    │                 │ N
    │                 │
    │                 │ 1
    │         ┌───────────────┐
    │         │   lobbyists   │ (existing table)
    │         └───────────────┘
    │
    │ 1
    │
    │ N
┌────────────────────┐          N ┌──────────────────────┐
│ watchlist_entries  │◄───────────┤   notifications      │
│ (user tracks bill) │            │   (email log)        │
└────────────────────┘            └──────────────────────┘
    │ N                                    │ N
    │                                      │
    │ 1                                    │ 1
┌───────────────┐                    ┌───────────────┐
│     users     │ (existing table)   │     users     │
└───────────────┘                    └───────────────┘
```

## Tables

### 1. legislative_sessions

**Purpose**: Metadata about Texas legislative sessions (regular and special)

```sql
CREATE TABLE public.legislative_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Session identifiers
  session_number INTEGER NOT NULL,              -- e.g., 88, 89
  session_type TEXT NOT NULL CHECK (session_type IN ('regular', 'special')),
  called_session_number INTEGER,                -- NULL for regular, 1/2/3 for special
  session_code TEXT UNIQUE NOT NULL,            -- e.g., "88R", "881", "882"

  -- Session dates
  start_date DATE NOT NULL,
  end_date DATE,                                -- NULL if ongoing
  is_active BOOLEAN DEFAULT false,

  -- FTP sync info
  ftp_directory TEXT,                           -- e.g., "/bills/89R/"

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_legislative_sessions_active ON legislative_sessions (is_active) WHERE is_active = true;
CREATE INDEX idx_legislative_sessions_code ON legislative_sessions (session_code);
```

**Sample Data**:
```sql
INSERT INTO legislative_sessions (session_number, session_type, session_code, start_date, end_date, is_active, ftp_directory) VALUES
  (88, 'regular', '88R', '2023-01-10', '2023-05-29', false, '/bills/88R/'),
  (88, 'special', '881', '2023-06-15', '2023-07-10', false, '/bills/881/'),
  (89, 'regular', '89R', '2025-01-14', NULL, true, '/bills/89R/');
```

---

### 2. bills

**Purpose**: Core legislative bill data from Texas Legislature

```sql
CREATE TABLE public.bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Bill identification
  bill_number TEXT NOT NULL,                    -- e.g., "HB 1", "SB 123"
  chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
  session_id UUID NOT NULL REFERENCES legislative_sessions(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,                    -- e.g., "89r-hb-1"

  -- Bill content
  title TEXT NOT NULL,                          -- Official title
  summary TEXT,                                 -- Short description/caption
  full_text TEXT,                               -- Complete bill text (HTML stripped)
  full_text_url TEXT,                           -- Link to official bill text

  -- Authorship
  primary_author TEXT NOT NULL,                 -- e.g., "Representative Smith"
  coauthors TEXT[],                             -- Array of co-author names

  -- Classification
  subject_areas TEXT[],                         -- e.g., ["Healthcare", "Insurance"]
  keywords TEXT[],                              -- Additional search keywords

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'filed',         -- Current status (see below)
  status_date TIMESTAMPTZ DEFAULT NOW(),        -- When status last changed
  last_action TEXT,                             -- Most recent action description

  -- Committee & voting
  committee_referrals TEXT[],                   -- Committees bill referred to
  fiscal_note_url TEXT,                         -- Link to fiscal note if exists

  -- Companion bill (same bill in other chamber)
  companion_bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,

  -- Full-text search (generated column)
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(bill_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(subject_areas, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(full_text, '')), 'C')
  ) STORED,

  -- Analytics
  view_count INTEGER DEFAULT 0,

  -- Sync metadata
  ftp_source_file TEXT,                         -- Original FTP file path
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  filed_date DATE,                              -- When bill was filed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_bills_session ON bills (session_id);
CREATE INDEX idx_bills_status ON bills (status);
CREATE INDEX idx_bills_chamber ON bills (chamber);
CREATE INDEX idx_bills_subject_areas ON bills USING GIN (subject_areas);
CREATE INDEX idx_bills_search_vector ON bills USING GIN (search_vector);
CREATE UNIQUE INDEX idx_bills_session_number ON bills (session_id, bill_number);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Status Values**:
- `filed` - Bill introduced/filed
- `referred` - Referred to committee
- `hearing_scheduled` - Committee hearing scheduled
- `committee_passed` - Passed committee
- `committee_failed` - Failed in committee
- `floor_calendar` - On floor calendar for vote
- `passed_chamber` - Passed originating chamber
- `sent_to_other_chamber` - Sent to House/Senate
- `passed_both_chambers` - Passed both chambers
- `sent_to_governor` - Sent to Governor for signature
- `signed` - Signed into law
- `vetoed` - Vetoed by Governor
- `dead` - Died/withdrawn

---

### 3. bill_updates

**Purpose**: Historical record of bill status changes and amendments (used for notifications)

```sql
CREATE TABLE public.bill_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,

  -- Change information
  update_type TEXT NOT NULL CHECK (update_type IN ('status_change', 'amendment', 'vote', 'hearing', 'other')),
  previous_status TEXT,
  new_status TEXT,
  description TEXT NOT NULL,                    -- Human-readable description

  -- Metadata
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bill_updates_bill ON bill_updates (bill_id);
CREATE INDEX idx_bill_updates_changed_at ON bill_updates (changed_at DESC);
CREATE INDEX idx_bill_updates_type ON bill_updates (update_type);
```

**Sample Data**:
```sql
INSERT INTO bill_updates (bill_id, update_type, previous_status, new_status, description) VALUES
  ('bill-uuid-1', 'status_change', 'filed', 'referred', 'Referred to House Committee on Education'),
  ('bill-uuid-1', 'hearing', 'referred', 'referred', 'Public hearing scheduled for March 20, 2025 at 2:00 PM'),
  ('bill-uuid-1', 'status_change', 'referred', 'committee_passed', 'Passed House Education Committee (7-2 vote)');
```

---

### 4. watchlist_entries

**Purpose**: User's tracked bills with notification preferences

```sql
CREATE TABLE public.watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,

  -- Notification preferences
  notifications_enabled BOOLEAN DEFAULT true,
  notify_on_status_change BOOLEAN DEFAULT true,
  notify_on_hearing BOOLEAN DEFAULT true,
  notify_on_amendment BOOLEAN DEFAULT true,
  notify_on_vote BOOLEAN DEFAULT true,
  notify_on_governor_action BOOLEAN DEFAULT true,

  -- Digest preferences
  digest_mode BOOLEAN DEFAULT false,            -- true = daily digest, false = immediate
  digest_time TIME DEFAULT '08:00:00',          -- Time for daily digest (CST)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure user can't track same bill twice
  UNIQUE (user_id, bill_id)
);

CREATE INDEX idx_watchlist_user ON watchlist_entries (user_id);
CREATE INDEX idx_watchlist_bill ON watchlist_entries (bill_id);
CREATE INDEX idx_watchlist_notifications_enabled ON watchlist_entries (notifications_enabled) WHERE notifications_enabled = true;
```

**RLS Policies**:
```sql
ALTER TABLE watchlist_entries ENABLE ROW LEVEL SECURITY;

-- Users can only see their own watchlist
CREATE POLICY "Users can view own watchlist"
  ON watchlist_entries FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own watchlist
CREATE POLICY "Users can insert own watchlist"
  ON watchlist_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlist
CREATE POLICY "Users can update own watchlist"
  ON watchlist_entries FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete from their own watchlist
CREATE POLICY "Users can delete own watchlist"
  ON watchlist_entries FOR DELETE
  USING (auth.uid() = user_id);
```

---

### 5. bill_tags

**Purpose**: Lobbyist expertise claims on specific bills (with optional analysis/notes)

```sql
CREATE TABLE public.bill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  lobbyist_id UUID NOT NULL REFERENCES lobbyists(id) ON DELETE CASCADE,

  -- Lobbyist insights
  notes TEXT,                                   -- Lobbyist's analysis/context
  notes_updated_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure lobbyist can't tag same bill twice
  UNIQUE (bill_id, lobbyist_id)
);

CREATE INDEX idx_bill_tags_bill ON bill_tags (bill_id);
CREATE INDEX idx_bill_tags_lobbyist ON bill_tags (lobbyist_id);
```

**RLS Policies**:
```sql
ALTER TABLE bill_tags ENABLE ROW LEVEL SECURITY;

-- Everyone can view bill tags (public information)
CREATE POLICY "Public can view bill tags"
  ON bill_tags FOR SELECT
  USING (true);

-- Only lobbyists can create tags for their own profile
CREATE POLICY "Lobbyists can insert own tags"
  ON bill_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lobbyists l
      WHERE l.id = lobbyist_id AND l.user_id = auth.uid()
    )
  );

-- Only lobbyists can update their own tags
CREATE POLICY "Lobbyists can update own tags"
  ON bill_tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lobbyists l
      WHERE l.id = lobbyist_id AND l.user_id = auth.uid()
    )
  );

-- Only lobbyists can delete their own tags
CREATE POLICY "Lobbyists can delete own tags"
  ON bill_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM lobbyists l
      WHERE l.id = lobbyist_id AND l.user_id = auth.uid()
    )
  );
```

**Subscription Tier Enforcement** (application layer):
```typescript
// Before inserting bill_tag, check tier limits
async function canTagBill(lobbyistId: string): Promise<boolean> {
  const lobbyist = await supabase
    .from('lobbyists')
    .select('subscription_tier')
    .eq('id', lobbyistId)
    .single();

  if (lobbyist.subscription_tier === 'free') {
    const tagCount = await supabase
      .from('bill_tags')
      .select('id', { count: 'exact' })
      .eq('lobbyist_id', lobbyistId);

    return (tagCount.count || 0) < 5;  // Free tier limit
  }

  return true;  // Premium/featured unlimited
}
```

---

### 6. notifications

**Purpose**: Log of sent email notifications (for tracking and preventing duplicates)

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  bill_update_id UUID REFERENCES bill_updates(id) ON DELETE SET NULL,

  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('status_change', 'amendment', 'vote', 'hearing', 'governor_action', 'digest')),
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,

  -- Delivery status
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'bounced', 'failed')),
  resend_message_id TEXT,                       -- Resend API message ID for tracking

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id);
CREATE INDEX idx_notifications_bill ON notifications (bill_id);
CREATE INDEX idx_notifications_sent_at ON notifications (sent_at DESC);
CREATE INDEX idx_notifications_status ON notifications (delivery_status);
```

**RLS Policies**:
```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- No insert/update/delete for users (managed by system)
```

---

## Database Functions

### search_bills()

**Purpose**: Full-text search with subscription tier ranking

```sql
CREATE OR REPLACE FUNCTION search_bills(
  search_query TEXT DEFAULT NULL,
  subject_filters TEXT[] DEFAULT NULL,
  session_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  limit_count INT DEFAULT 20,
  offset_count INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  bill_number TEXT,
  chamber TEXT,
  title TEXT,
  summary TEXT,
  status TEXT,
  subject_areas TEXT[],
  filed_date DATE,
  slug TEXT,
  rank_score BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (b.id)
    b.id,
    b.bill_number,
    b.chamber,
    b.title,
    b.summary,
    b.status,
    b.subject_areas,
    b.filed_date,
    b.slug,
    (
      -- Ranking algorithm (per spec & research)
      CASE
        WHEN MAX(l.subscription_tier) = 'featured' THEN 1000000
        WHEN MAX(l.subscription_tier) = 'premium' THEN 100000
        ELSE 0
      END +
      CASE
        WHEN search_query IS NOT NULL THEN
          (ts_rank(b.search_vector, plainto_tsquery('english', search_query)) * 10000)::INT
        ELSE 0
      END +
      COALESCE(b.view_count, 0)
    )::BIGINT AS rank_score
  FROM bills b
  LEFT JOIN bill_tags bt ON bt.bill_id = b.id
  LEFT JOIN lobbyists l ON l.id = bt.lobbyist_id
  LEFT JOIN legislative_sessions s ON s.id = b.session_id
  WHERE
    (search_query IS NULL OR b.search_vector @@ plainto_tsquery('english', search_query))
    AND (subject_filters IS NULL OR b.subject_areas && subject_filters)
    AND (session_filter IS NULL OR s.session_code = session_filter)
    AND (status_filter IS NULL OR b.status = status_filter)
  GROUP BY b.id
  ORDER BY b.id, rank_score DESC, b.bill_number ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;
```

### get_user_watchlist()

**Purpose**: Retrieve user's watchlist with bill details

```sql
CREATE OR REPLACE FUNCTION get_user_watchlist(p_user_id UUID)
RETURNS TABLE (
  watchlist_id UUID,
  bill_id UUID,
  bill_number TEXT,
  title TEXT,
  status TEXT,
  status_date TIMESTAMPTZ,
  last_action TEXT,
  notifications_enabled BOOLEAN,
  added_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id AS watchlist_id,
    b.id AS bill_id,
    b.bill_number,
    b.title,
    b.status,
    b.status_date,
    b.last_action,
    w.notifications_enabled,
    w.created_at AS added_at
  FROM watchlist_entries w
  JOIN bills b ON b.id = w.bill_id
  WHERE w.user_id = p_user_id
  ORDER BY b.status_date DESC, b.bill_number ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

## Validation Rules (Application Layer)

### Watchlist Size Limits

```typescript
interface WatchlistLimits {
  free: 10;
  premium: Infinity;
  featured: Infinity;
}

async function canAddToWatchlist(userId: string): Promise<boolean> {
  const user = await supabase.from('users')
    .select('subscription_tier')
    .eq('id', userId)
    .single();

  if (user.subscription_tier === 'free') {
    const watchlistCount = await supabase.from('watchlist_entries')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    return (watchlistCount.count || 0) < 10;
  }

  return true;  // Premium/featured unlimited
}
```

### Bill Tag Limits

```typescript
interface BillTagLimits {
  free: 5;
  premium: Infinity;
  featured: Infinity;
}

async function canTagBill(lobbyistId: string): Promise<boolean> {
  const lobbyist = await supabase.from('lobbyists')
    .select('subscription_tier')
    .eq('id', lobbyistId)
    .single();

  if (lobbyist.subscription_tier === 'free') {
    const tagCount = await supabase.from('bill_tags')
      .select('id', { count: 'exact' })
      .eq('lobbyist_id', lobbyistId);

    return (tagCount.count || 0) < 5;
  }

  return true;  // Premium/featured unlimited
}
```

---

## Type Definitions (TypeScript)

```typescript
// Auto-generated from Supabase schema
export type LegislativeSession = Database['public']['Tables']['legislative_sessions']['Row'];
export type Bill = Database['public']['Tables']['bills']['Row'];
export type BillUpdate = Database['public']['Tables']['bill_updates']['Row'];
export type WatchlistEntry = Database['public']['Tables']['watchlist_entries']['Row'];
export type BillTag = Database['public']['Tables']['bill_tags']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

// Insert types
export type LegislativeSessionInsert = Database['public']['Tables']['legislative_sessions']['Insert'];
export type BillInsert = Database['public']['Tables']['bills']['Insert'];
// ... etc

// Update types
export type LegislativeSessionUpdate = Database['public']['Tables']['legislative_sessions']['Update'];
export type BillUpdate = Database['public']['Tables']['bills']['Update'];
// ... etc

// Enums
export type BillStatus =
  | 'filed'
  | 'referred'
  | 'hearing_scheduled'
  | 'committee_passed'
  | 'committee_failed'
  | 'floor_calendar'
  | 'passed_chamber'
  | 'sent_to_other_chamber'
  | 'passed_both_chambers'
  | 'sent_to_governor'
  | 'signed'
  | 'vetoed'
  | 'dead';

export type Chamber = 'house' | 'senate';
export type SessionType = 'regular' | 'special';
export type UpdateType = 'status_change' | 'amendment' | 'vote' | 'hearing' | 'other';
export type NotificationType = 'status_change' | 'amendment' | 'vote' | 'hearing' | 'governor_action' | 'digest';
export type DeliveryStatus = 'sent' | 'delivered' | 'bounced' | 'failed';
```

---

## Migration Script

```sql
-- Migration: Add Bill Tracker Schema
-- File: supabase/migrations/YYYYMMDDHHMMSS_add_bill_tracker_schema.sql

BEGIN;

-- 1. Create legislative_sessions table
CREATE TABLE IF NOT EXISTS public.legislative_sessions (
  -- [full schema from above]
);

-- 2. Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
  -- [full schema from above]
);

-- 3. Create bill_updates table
CREATE TABLE IF NOT EXISTS public.bill_updates (
  -- [full schema from above]
);

-- 4. Create watchlist_entries table
CREATE TABLE IF NOT EXISTS public.watchlist_entries (
  -- [full schema from above]
);

-- 5. Create bill_tags table
CREATE TABLE IF NOT EXISTS public.bill_tags (
  -- [full schema from above]
);

-- 6. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  -- [full schema from above]
);

-- 7. Create indexes
-- [all CREATE INDEX statements from above]

-- 8. Create functions
-- [search_bills(), get_user_watchlist(), etc.]

-- 9. Create RLS policies
-- [all RLS policies from above]

-- 10. Enable RLS
ALTER TABLE watchlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

COMMIT;
```

---

## Data Model Summary

**New Tables**: 6
- `legislative_sessions` (session metadata)
- `bills` (core bill data with full-text search)
- `bill_updates` (status change history)
- `watchlist_entries` (user tracking with RLS)
- `bill_tags` (lobbyist expertise with RLS)
- `notifications` (email log with RLS)

**Relationships**:
- Bills belong to legislative sessions (N:1)
- Bills have many updates (1:N)
- Bills have many watchlist entries (1:N)
- Bills have many tags from lobbyists (1:N)
- Users have many watchlist entries (1:N)
- Lobbyists have many bill tags (1:N)

**Security**:
- RLS enabled on user-specific tables
- Users can only access their own watchlists and notifications
- Lobbyists can only manage their own tags
- Public read access for bill data and tags

**Performance**:
- Full-text search with GIN indexes
- Compound indexes for common queries
- Generated `tsvector` column for search
- Efficient pagination support

**Scale**: Designed to handle 10,000+ bills efficiently

---

**Status**: ✅ Complete
**Next**: API Contracts (`contracts/*.yaml`)
