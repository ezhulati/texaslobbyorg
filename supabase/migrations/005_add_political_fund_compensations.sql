-- Political Fund Compensations Table
-- Tracks compensation/reimbursement from political funds to lobbyists
-- Data source: Texas Ethics Commission 2025 Lobbyists Compensated/Reimbursed By Political Funds

CREATE TABLE IF NOT EXISTS public.political_fund_compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,

  -- Political fund/contributor information
  fund_name TEXT NOT NULL,
  contributor_name TEXT, -- May differ from fund_name based on TEC data structure

  -- Compensation details
  year INTEGER NOT NULL,
  amount NUMERIC(12, 2), -- Allow NULL if amount not disclosed

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_political_fund_compensations_lobbyist_id
  ON public.political_fund_compensations(lobbyist_id);

CREATE INDEX IF NOT EXISTS idx_political_fund_compensations_fund_name
  ON public.political_fund_compensations(fund_name);

CREATE INDEX IF NOT EXISTS idx_political_fund_compensations_year
  ON public.political_fund_compensations(year);

-- Composite index for common query pattern (lobbyist + year)
CREATE INDEX IF NOT EXISTS idx_political_fund_compensations_lobbyist_year
  ON public.political_fund_compensations(lobbyist_id, year);

-- Apply updated_at trigger
CREATE TRIGGER update_political_fund_compensations_updated_at
  BEFORE UPDATE ON public.political_fund_compensations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE public.political_fund_compensations ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view political fund compensation data (public transparency)
CREATE POLICY "Public can view political fund compensations"
  ON public.political_fund_compensations
  FOR SELECT
  TO public
  USING (true);

-- Policy: Only authenticated users with admin role can insert/update/delete
-- (This will be refined when auth system is implemented in Week 3)
CREATE POLICY "Admin can manage political fund compensations"
  ON public.political_fund_compensations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON public.political_fund_compensations TO anon;
GRANT ALL ON public.political_fund_compensations TO authenticated;
