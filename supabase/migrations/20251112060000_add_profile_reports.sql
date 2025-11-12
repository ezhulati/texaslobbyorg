-- Create profile_reports table for tracking user-reported issues
CREATE TABLE IF NOT EXISTS profile_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES lobbyists(id) ON DELETE CASCADE,
  lobbyist_name TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'incorrect_info',
    'outdated_clients',
    'fraudulent_claims',
    'duplicate_profile',
    'inappropriate_content',
    'other'
  )),
  description TEXT NOT NULL,
  reporter_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_profile_reports_lobbyist_id ON profile_reports(lobbyist_id);
CREATE INDEX idx_profile_reports_status ON profile_reports(status);
CREATE INDEX idx_profile_reports_created_at ON profile_reports(created_at DESC);

-- Enable RLS
ALTER TABLE profile_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create reports (anonymous reporting allowed)
CREATE POLICY "Anyone can create reports"
  ON profile_reports
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Only admins can view reports
CREATE POLICY "Admins can view all reports"
  ON profile_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy: Only admins can update reports
CREATE POLICY "Admins can update reports"
  ON profile_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_profile_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_reports_updated_at
  BEFORE UPDATE ON profile_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_reports_updated_at();

-- Add comment
COMMENT ON TABLE profile_reports IS 'User-reported issues with lobbyist profiles (incorrect info, fraudulent claims, etc)';
