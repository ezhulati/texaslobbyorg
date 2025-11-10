-- Migration: Bill Tracker Schema
-- Created: 2025-11-10
-- Description: Adds Texas legislative bill tracking system with 6 tables, RLS policies, and search functions

-- ============================================================================
-- TABLE: legislative_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS legislative_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL UNIQUE, -- e.g., "89R" (89th Regular), "881" (88th Special Session 1)
  session_number INTEGER NOT NULL, -- e.g., 89
  session_type TEXT NOT NULL CHECK (session_type IN ('regular', 'special')),
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_legislative_sessions_code ON legislative_sessions(session_code);
CREATE INDEX idx_legislative_sessions_current ON legislative_sessions(is_current) WHERE is_current = true;

-- ============================================================================
-- TABLE: bills
-- ============================================================================
CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES legislative_sessions(id) ON DELETE CASCADE,
  bill_number TEXT NOT NULL, -- e.g., "HB 123", "SB 456"
  chamber TEXT NOT NULL CHECK (chamber IN ('house', 'senate')),
  slug TEXT NOT NULL UNIQUE, -- e.g., "89r-hb-123"

  -- Basic info
  title TEXT NOT NULL,
  summary TEXT,
  full_text TEXT,

  -- Authors and sponsors
  primary_author TEXT,
  co_authors TEXT[], -- Array of legislator names

  -- Classification
  subject_areas TEXT[], -- Array of subject slugs

  -- Status tracking
  current_status TEXT NOT NULL DEFAULT 'filed',
  status_date DATE,
  last_action TEXT,
  last_action_date DATE,

  -- Additional data
  fiscal_note_url TEXT,
  companion_bill_id UUID REFERENCES bills(id), -- Links HB <-> SB companions

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(bill_number, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(title, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(full_text, '')), 'D')
  ) STORED,

  -- Metadata
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(session_id, bill_number)
);

-- Indexes for bills table
CREATE INDEX idx_bills_session ON bills(session_id);
CREATE INDEX idx_bills_slug ON bills(slug);
CREATE INDEX idx_bills_chamber ON bills(chamber);
CREATE INDEX idx_bills_status ON bills(current_status);
CREATE INDEX idx_bills_subject_areas ON bills USING GIN(subject_areas);
CREATE INDEX idx_bills_search_vector ON bills USING GIN(search_vector);
CREATE INDEX idx_bills_updated_at ON bills(updated_at DESC);

-- ============================================================================
-- TABLE: bill_updates
-- ============================================================================
CREATE TABLE IF NOT EXISTS bill_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,

  update_type TEXT NOT NULL CHECK (update_type IN (
    'filed',
    'referred_to_committee',
    'hearing_scheduled',
    'committee_vote',
    'floor_calendar',
    'floor_vote',
    'sent_to_other_chamber',
    'sent_to_governor',
    'signed',
    'vetoed',
    'amended',
    'dead'
  )),

  old_status TEXT,
  new_status TEXT,
  description TEXT,
  action_date DATE NOT NULL,

  -- For tracking which users have been notified
  notified_user_ids UUID[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bill_updates_bill ON bill_updates(bill_id);
CREATE INDEX idx_bill_updates_type ON bill_updates(update_type);
CREATE INDEX idx_bill_updates_action_date ON bill_updates(action_date DESC);
CREATE INDEX idx_bill_updates_notified ON bill_updates USING GIN(notified_user_ids);

-- ============================================================================
-- TABLE: watchlist_entries
-- ============================================================================
CREATE TABLE IF NOT EXISTS watchlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,

  -- Notification preferences
  notifications_enabled BOOLEAN DEFAULT true,
  notification_types TEXT[] DEFAULT ARRAY[
    'hearing_scheduled',
    'committee_vote',
    'floor_vote',
    'sent_to_governor',
    'signed',
    'vetoed'
  ]::TEXT[],

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, bill_id)
);

CREATE INDEX idx_watchlist_user ON watchlist_entries(user_id);
CREATE INDEX idx_watchlist_bill ON watchlist_entries(bill_id);
CREATE INDEX idx_watchlist_notifications ON watchlist_entries(user_id) WHERE notifications_enabled = true;

-- ============================================================================
-- TABLE: bill_tags
-- ============================================================================
CREATE TABLE IF NOT EXISTS bill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  lobbyist_id UUID NOT NULL REFERENCES lobbyists(id) ON DELETE CASCADE,

  -- Lobbyist's analysis/insights
  context_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(bill_id, lobbyist_id)
);

CREATE INDEX idx_bill_tags_bill ON bill_tags(bill_id);
CREATE INDEX idx_bill_tags_lobbyist ON bill_tags(lobbyist_id);

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  bill_update_id UUID NOT NULL REFERENCES bill_updates(id) ON DELETE CASCADE,

  notification_type TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,

  sent_at TIMESTAMPTZ,
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_bill ON notifications(bill_id);
CREATE INDEX idx_notifications_status ON notifications(delivery_status) WHERE delivery_status = 'pending';
CREATE INDEX idx_notifications_sent_at ON notifications(sent_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE legislative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- legislative_sessions: Public read, admin write
CREATE POLICY "legislative_sessions_select_policy" ON legislative_sessions
  FOR SELECT USING (true);

-- bills: Public read, admin write
CREATE POLICY "bills_select_policy" ON bills
  FOR SELECT USING (true);

-- bill_updates: Public read, admin write
CREATE POLICY "bill_updates_select_policy" ON bill_updates
  FOR SELECT USING (true);

-- watchlist_entries: Users can only see their own
CREATE POLICY "watchlist_entries_select_policy" ON watchlist_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "watchlist_entries_insert_policy" ON watchlist_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "watchlist_entries_update_policy" ON watchlist_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "watchlist_entries_delete_policy" ON watchlist_entries
  FOR DELETE USING (auth.uid() = user_id);

-- bill_tags: Public read, lobbyists can manage their own
CREATE POLICY "bill_tags_select_policy" ON bill_tags
  FOR SELECT USING (true);

CREATE POLICY "bill_tags_insert_policy" ON bill_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM lobbyists
      WHERE id = bill_tags.lobbyist_id
      AND (user_id = auth.uid() OR claimed_by = auth.uid())
    )
  );

CREATE POLICY "bill_tags_update_policy" ON bill_tags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM lobbyists
      WHERE id = bill_tags.lobbyist_id
      AND (user_id = auth.uid() OR claimed_by = auth.uid())
    )
  );

CREATE POLICY "bill_tags_delete_policy" ON bill_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM lobbyists
      WHERE id = bill_tags.lobbyist_id
      AND (user_id = auth.uid() OR claimed_by = auth.uid())
    )
  );

-- notifications: Users can only see their own
CREATE POLICY "notifications_select_policy" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function: search_bills
-- Full-text search with ranking and filtering
CREATE OR REPLACE FUNCTION search_bills(
  search_query TEXT DEFAULT NULL,
  session_filter UUID DEFAULT NULL,
  chamber_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  subject_filters TEXT[] DEFAULT NULL,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  session_id UUID,
  bill_number TEXT,
  chamber TEXT,
  slug TEXT,
  title TEXT,
  summary TEXT,
  primary_author TEXT,
  subject_areas TEXT[],
  current_status TEXT,
  status_date DATE,
  view_count INTEGER,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.session_id,
    b.bill_number,
    b.chamber,
    b.slug,
    b.title,
    b.summary,
    b.primary_author,
    b.subject_areas,
    b.current_status,
    b.status_date,
    b.view_count,
    CASE
      WHEN search_query IS NOT NULL THEN
        ts_rank(b.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0
    END AS search_rank
  FROM bills b
  WHERE
    (search_query IS NULL OR b.search_vector @@ websearch_to_tsquery('english', search_query))
    AND (session_filter IS NULL OR b.session_id = session_filter)
    AND (chamber_filter IS NULL OR b.chamber = chamber_filter)
    AND (status_filter IS NULL OR b.current_status = status_filter)
    AND (subject_filters IS NULL OR b.subject_areas && subject_filters)
  ORDER BY
    CASE WHEN search_query IS NOT NULL THEN search_rank ELSE 0 END DESC,
    b.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: get_user_watchlist
-- Returns user's watchlist with bill details
CREATE OR REPLACE FUNCTION get_user_watchlist(
  p_user_id UUID,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  watchlist_id UUID,
  bill_id UUID,
  bill_number TEXT,
  chamber TEXT,
  slug TEXT,
  title TEXT,
  summary TEXT,
  current_status TEXT,
  status_date DATE,
  notifications_enabled BOOLEAN,
  added_at TIMESTAMPTZ,
  bill_updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    we.id AS watchlist_id,
    b.id AS bill_id,
    b.bill_number,
    b.chamber,
    b.slug,
    b.title,
    b.summary,
    b.current_status,
    b.status_date,
    we.notifications_enabled,
    we.created_at AS added_at,
    b.updated_at AS bill_updated_at
  FROM watchlist_entries we
  JOIN bills b ON we.bill_id = b.id
  WHERE we.user_id = p_user_id
  ORDER BY b.updated_at DESC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: update_updated_at_column
-- Trigger function for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger to tables that need it
CREATE TRIGGER update_legislative_sessions_updated_at
  BEFORE UPDATE ON legislative_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_entries_updated_at
  BEFORE UPDATE ON watchlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_tags_updated_at
  BEFORE UPDATE ON bill_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: Current Legislative Session
-- ============================================================================

-- Insert 89th Regular Session (2025)
INSERT INTO legislative_sessions (session_code, session_number, session_type, start_date, end_date, is_current)
VALUES ('89R', 89, 'regular', '2025-01-14', '2025-06-02', true)
ON CONFLICT (session_code) DO NOTHING;

-- Grant permissions for service role to bypass RLS (for background jobs)
GRANT ALL ON legislative_sessions TO service_role;
GRANT ALL ON bills TO service_role;
GRANT ALL ON bill_updates TO service_role;
GRANT ALL ON watchlist_entries TO service_role;
GRANT ALL ON bill_tags TO service_role;
GRANT ALL ON notifications TO service_role;
