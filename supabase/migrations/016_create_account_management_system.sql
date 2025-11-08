-- Migration 016: Account Management System
-- Creates tables for account merging, role upgrades, account deletion, and fraud reporting

-- ============================================================================
-- PART 1: Account Merge Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_merge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,
  duplicate_lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_document_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Ensure primary and duplicate are different profiles
  CONSTRAINT different_profiles CHECK (primary_lobbyist_id != duplicate_lobbyist_id)
);

CREATE INDEX IF NOT EXISTS idx_merge_requests_status ON public.account_merge_requests(status);
CREATE INDEX IF NOT EXISTS idx_merge_requests_user ON public.account_merge_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_merge_requests_pending ON public.account_merge_requests(submitted_at) WHERE status = 'pending';

-- ============================================================================
-- PART 2: Role Upgrade Requests (Searcher → Lobbyist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_upgrade_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_role user_role NOT NULL,
  requested_role user_role NOT NULL,
  reason TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- One pending request per user
  CONSTRAINT unique_pending_upgrade UNIQUE (user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_role_upgrade_status ON public.role_upgrade_requests(status);
CREATE INDEX IF NOT EXISTS idx_role_upgrade_pending ON public.role_upgrade_requests(submitted_at) WHERE status = 'pending';

-- ============================================================================
-- PART 3: Account Deletion Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lobbyist_id UUID REFERENCES public.lobbyists(id) ON DELETE SET NULL,
  deletion_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ NOT NULL,
  cancellation_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'cancelled', 'completed')) DEFAULT 'pending',
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_scheduled ON public.account_deletion_requests(scheduled_deletion_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_deletion_requests_token ON public.account_deletion_requests(cancellation_token) WHERE status = 'pending';

-- ============================================================================
-- PART 4: Fraud Reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fraud_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('fraudulent_claim', 'impersonation', 'fake_profile', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')) DEFAULT 'open',
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_fraud_reports_status ON public.fraud_reports(status);
CREATE INDEX IF NOT EXISTS idx_fraud_reports_lobbyist ON public.fraud_reports(lobbyist_id);
CREATE INDEX IF NOT EXISTS idx_fraud_reports_open ON public.fraud_reports(reported_at) WHERE status IN ('open', 'investigating');

-- ============================================================================
-- PART 5: Update lobbyists table for deletion tracking
-- ============================================================================

ALTER TABLE public.lobbyists
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_lobbyists_deleted ON public.lobbyists(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================================================
-- PART 6: Row Level Security Policies
-- ============================================================================

-- Account Merge Requests
ALTER TABLE public.account_merge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own merge requests"
ON public.account_merge_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create merge requests"
ON public.account_merge_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all merge requests"
ON public.account_merge_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update merge requests"
ON public.account_merge_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Role Upgrade Requests
ALTER TABLE public.role_upgrade_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role upgrade requests"
ON public.role_upgrade_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create role upgrade requests"
ON public.role_upgrade_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all role upgrade requests"
ON public.role_upgrade_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update role upgrade requests"
ON public.role_upgrade_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Account Deletion Requests
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
ON public.account_deletion_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create deletion requests"
ON public.account_deletion_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all deletion requests"
ON public.account_deletion_requests FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Fraud Reports
ALTER TABLE public.fraud_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit fraud reports"
ON public.fraud_reports FOR INSERT TO authenticated
WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Users can view own fraud reports"
ON public.fraud_reports FOR SELECT TO authenticated
USING (reported_by = auth.uid());

CREATE POLICY "Admins can view all fraud reports"
ON public.fraud_reports FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update fraud reports"
ON public.fraud_reports FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- PART 7: Helper Functions
-- ============================================================================

-- Function to anonymize deleted user data (GDPR compliance)
CREATE OR REPLACE FUNCTION anonymize_deleted_user(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Anonymize lobbyist profile
  UPDATE public.lobbyists
  SET
    first_name = 'Deleted',
    last_name = 'User',
    email = CONCAT('deleted_', user_uuid, '@deleted.local'),
    phone = NULL,
    bio = NULL,
    profile_image_url = NULL,
    website = NULL,
    deleted_at = NOW()
  WHERE user_id = user_uuid OR claimed_by = user_uuid;

  -- Delete claim requests (no longer needed after deletion)
  DELETE FROM public.profile_claim_requests WHERE user_id = user_uuid;

  -- Delete merge requests (no longer relevant)
  DELETE FROM public.account_merge_requests WHERE user_id = user_uuid;

  -- Delete role upgrade requests
  DELETE FROM public.role_upgrade_requests WHERE user_id = user_uuid;

  -- Keep fraud reports but anonymize reporter
  UPDATE public.fraud_reports
  SET reported_by = NULL
  WHERE reported_by = user_uuid;

  -- Note: User record in public.users and auth.users will be handled separately
  -- Subscription/payment records preserved for legal/tax compliance
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect potential duplicate profiles (fuzzy name matching)
CREATE OR REPLACE FUNCTION find_potential_duplicates(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  similarity_score REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.first_name,
    l.last_name,
    l.email,
    GREATEST(
      similarity(l.first_name || ' ' || l.last_name, p_first_name || ' ' || p_last_name),
      CASE WHEN p_email IS NOT NULL AND l.email IS NOT NULL
        THEN CASE WHEN LOWER(l.email) = LOWER(p_email) THEN 1.0 ELSE 0.0 END
        ELSE 0.0
      END
    ) AS similarity_score
  FROM public.lobbyists l
  WHERE
    l.deleted_at IS NULL
    AND (
      similarity(l.first_name || ' ' || l.last_name, p_first_name || ' ' || p_last_name) > 0.6
      OR (p_email IS NOT NULL AND LOWER(l.email) = LOWER(p_email))
    )
  ORDER BY similarity_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count pending admin tasks (for dashboard badge)
CREATE OR REPLACE FUNCTION count_pending_admin_tasks()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'pending_claims', (SELECT COUNT(*) FROM public.profile_claim_requests WHERE status = 'pending'),
    'pending_merges', (SELECT COUNT(*) FROM public.account_merge_requests WHERE status = 'pending'),
    'pending_role_upgrades', (SELECT COUNT(*) FROM public.role_upgrade_requests WHERE status = 'pending'),
    'open_fraud_reports', (SELECT COUNT(*) FROM public.fraud_reports WHERE status IN ('open', 'investigating')),
    'pending_deletions', (SELECT COUNT(*) FROM public.account_deletion_requests WHERE status = 'pending')
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 8: Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.account_merge_requests IS 'Tracks requests to merge duplicate lobbyist profiles';
COMMENT ON TABLE public.role_upgrade_requests IS 'Tracks searcher→lobbyist role upgrade requests for admin approval';
COMMENT ON TABLE public.account_deletion_requests IS 'Tracks account deletion requests with 30-day grace period';
COMMENT ON TABLE public.fraud_reports IS 'Tracks fraud reports for profile claims and fake profiles';

COMMENT ON FUNCTION anonymize_deleted_user IS 'GDPR-compliant anonymization of user data after deletion grace period';
COMMENT ON FUNCTION find_potential_duplicates IS 'Fuzzy matching to detect duplicate lobbyist profiles by name/email';
COMMENT ON FUNCTION count_pending_admin_tasks IS 'Returns count of all pending admin tasks for dashboard badge';
