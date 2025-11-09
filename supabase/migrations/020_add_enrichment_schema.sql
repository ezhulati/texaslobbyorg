-- Migration 020: Add Enrichment Schema
-- Adds all tables and fields needed for data enrichment pipeline
-- Created: 2025-11-08
-- Scripts: enrich-tec-enforcement, enrich-austin-lobbying, enrich-opencorporates,
--          enrich-gdelt-mentions, enrich-procurement

-- =====================================================
-- ENFORCEMENT DATA (TEC Enforcement Script)
-- =====================================================

-- Table: enforcement_actions
-- Stores TEC enforcement actions (delinquent filings, sworn complaints)
CREATE TABLE IF NOT EXISTS enforcement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES lobbyists(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('delinquent_filing', 'sworn_complaint')),
  year INTEGER NOT NULL,
  description TEXT NOT NULL,
  fine_amount NUMERIC(10, 2),
  order_number TEXT,
  pdf_url TEXT,
  date_issued TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_enforcement_action UNIQUE (lobbyist_id, action_type, order_number, date_issued)
);

-- Indexes for enforcement_actions
CREATE INDEX idx_enforcement_actions_lobbyist ON enforcement_actions(lobbyist_id);
CREATE INDEX idx_enforcement_actions_year ON enforcement_actions(year);
CREATE INDEX idx_enforcement_actions_type ON enforcement_actions(action_type);

-- Add enforcement summary fields to lobbyists table
ALTER TABLE lobbyists ADD COLUMN IF NOT EXISTS enforcement_actions_count INTEGER DEFAULT 0;
ALTER TABLE lobbyists ADD COLUMN IF NOT EXISTS has_enforcement_history BOOLEAN DEFAULT FALSE;
ALTER TABLE lobbyists ADD COLUMN IF NOT EXISTS last_enforcement_year INTEGER;

-- =====================================================
-- MUNICIPAL LOBBYING DATA (Austin Lobbying Script)
-- =====================================================

-- Table: municipal_registrations
-- Stores city-level lobbying registrations (Austin, Houston, Dallas, etc.)
CREATE TABLE IF NOT EXISTS municipal_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES lobbyists(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  clients TEXT[] DEFAULT '{}',
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_municipal_registration UNIQUE (lobbyist_id, city, year)
);

-- Indexes for municipal_registrations
CREATE INDEX idx_municipal_registrations_lobbyist ON municipal_registrations(lobbyist_id);
CREATE INDEX idx_municipal_registrations_city ON municipal_registrations(city);
CREATE INDEX idx_municipal_registrations_year ON municipal_registrations(year);

-- Add municipal activity field to lobbyists table
ALTER TABLE lobbyists ADD COLUMN IF NOT EXISTS municipal_activity_cities TEXT[] DEFAULT '{}';

-- =====================================================
-- ENTITY NORMALIZATION (OpenCorporates + GLEIF Script)
-- =====================================================

-- Add corporate entity fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS jurisdiction TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS registered_address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS lei_code TEXT; -- Legal Entity Identifier
ALTER TABLE clients ADD COLUMN IF NOT EXISTS opencorporates_url TEXT;

-- Index for LEI code lookups
CREATE INDEX idx_clients_lei_code ON clients(lei_code) WHERE lei_code IS NOT NULL;

-- =====================================================
-- MEDIA MENTIONS (GDELT Script)
-- =====================================================

-- Table: media_mentions
-- Stores news articles mentioning lobbyists
CREATE TABLE IF NOT EXISTS media_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES lobbyists(id) ON DELETE CASCADE,
  article_url TEXT NOT NULL,
  article_title TEXT NOT NULL,
  published_date TIMESTAMPTZ NOT NULL,
  source_domain TEXT NOT NULL,
  source_country TEXT DEFAULT 'US',
  social_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_media_mention UNIQUE (lobbyist_id, article_url)
);

-- Indexes for media_mentions
CREATE INDEX idx_media_mentions_lobbyist ON media_mentions(lobbyist_id);
CREATE INDEX idx_media_mentions_published ON media_mentions(published_date DESC);
CREATE INDEX idx_media_mentions_source ON media_mentions(source_domain);

-- Add media presence fields to lobbyists table
ALTER TABLE lobbyists ADD COLUMN IF NOT EXISTS media_mentions_count INTEGER DEFAULT 0;
ALTER TABLE lobbyists ADD COLUMN IF NOT EXISTS media_mentions_last_30d INTEGER DEFAULT 0;
ALTER TABLE lobbyists ADD COLUMN IF NOT EXISTS last_media_mention_date TIMESTAMPTZ;

-- =====================================================
-- PROCUREMENT DATA (Procurement Script)
-- =====================================================

-- Table: client_contracts
-- Stores state contract awards (not yet linked to lobbyists, just client names)
CREATE TABLE IF NOT EXISTS client_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  contract_title TEXT NOT NULL,
  agency TEXT NOT NULL,
  amount NUMERIC(15, 2),
  award_date TIMESTAMPTZ,
  source_dataset TEXT NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for client_contracts
CREATE INDEX idx_client_contracts_name ON client_contracts(client_name);
CREATE INDEX idx_client_contracts_agency ON client_contracts(agency);
CREATE INDEX idx_client_contracts_award_date ON client_contracts(award_date DESC);
CREATE INDEX idx_client_contracts_amount ON client_contracts(amount DESC) WHERE amount IS NOT NULL;

-- GIN index for raw_data JSONB queries
CREATE INDEX idx_client_contracts_raw_data ON client_contracts USING GIN (raw_data);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE enforcement_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE municipal_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contracts ENABLE ROW LEVEL SECURITY;

-- Public read access to all enrichment data
CREATE POLICY "Public read access" ON enforcement_actions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON municipal_registrations FOR SELECT USING (true);
CREATE POLICY "Public read access" ON media_mentions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON client_contracts FOR SELECT USING (true);

-- Only service role can insert/update enrichment data
CREATE POLICY "Service role full access" ON enforcement_actions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON municipal_registrations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON media_mentions FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "Service role full access" ON client_contracts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get lobbyist enrichment summary
CREATE OR REPLACE FUNCTION get_lobbyist_enrichment_summary(lobbyist_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'enforcement', json_build_object(
      'total_actions', COUNT(DISTINCT ea.id),
      'has_history', l.has_enforcement_history,
      'last_year', l.last_enforcement_year
    ),
    'municipal', json_build_object(
      'cities', l.municipal_activity_cities,
      'total_registrations', COUNT(DISTINCT mr.id)
    ),
    'media', json_build_object(
      'total_mentions', l.media_mentions_count,
      'recent_mentions', l.media_mentions_last_30d,
      'last_mention', l.last_media_mention_date
    )
  ) INTO result
  FROM lobbyists l
  LEFT JOIN enforcement_actions ea ON ea.lobbyist_id = l.id
  LEFT JOIN municipal_registrations mr ON mr.lobbyist_id = l.id
  WHERE l.id = lobbyist_uuid
  GROUP BY l.id;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE enforcement_actions IS 'TEC enforcement actions including delinquent filings and sworn complaints';
COMMENT ON TABLE municipal_registrations IS 'City-level lobbying registrations (Austin, Houston, Dallas, etc.)';
COMMENT ON TABLE media_mentions IS 'News articles mentioning lobbyists from GDELT';
COMMENT ON TABLE client_contracts IS 'State contract awards to lobbyist clients';

COMMENT ON COLUMN lobbyists.enforcement_actions_count IS 'Total TEC enforcement actions for this lobbyist';
COMMENT ON COLUMN lobbyists.has_enforcement_history IS 'Whether lobbyist has any enforcement history';
COMMENT ON COLUMN lobbyists.last_enforcement_year IS 'Most recent year of enforcement action';
COMMENT ON COLUMN lobbyists.municipal_activity_cities IS 'Cities where lobbyist is registered (e.g., Austin, Houston)';
COMMENT ON COLUMN lobbyists.media_mentions_count IS 'Total news mentions from GDELT';
COMMENT ON COLUMN lobbyists.media_mentions_last_30d IS 'News mentions in last 30 days';
COMMENT ON COLUMN lobbyists.last_media_mention_date IS 'Date of most recent news mention';

COMMENT ON COLUMN clients.legal_name IS 'Official legal name from OpenCorporates/GLEIF';
COMMENT ON COLUMN clients.jurisdiction IS 'Legal jurisdiction (e.g., us_tx)';
COMMENT ON COLUMN clients.entity_type IS 'Entity type/category';
COMMENT ON COLUMN clients.lei_code IS 'Legal Entity Identifier from GLEIF';
COMMENT ON COLUMN clients.opencorporates_url IS 'OpenCorporates profile URL';
