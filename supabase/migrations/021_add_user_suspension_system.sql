-- Migration: Add User Suspension System
-- Description: Adds ability for admins to suspend/ban users temporarily or permanently
-- Created: 2025-11-08

-- =====================================================
-- 1. CREATE USER SUSPENSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  suspended_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,

  -- Suspension details
  reason TEXT NOT NULL CHECK (length(reason) >= 10),
  reason_category TEXT CHECK (reason_category IN ('spam', 'abuse', 'terms_violation', 'fraud', 'other')),
  internal_notes TEXT, -- Private admin notes, not shown to user

  -- Duration
  suspended_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL means permanent suspension

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE, -- FALSE when unsuspended
  unsuspended_at TIMESTAMPTZ,
  unsuspended_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_suspensions_user_id ON public.user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_active ON public.user_suspensions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_suspensions_expires ON public.user_suspensions(expires_at) WHERE expires_at IS NOT NULL;

-- Comments
COMMENT ON TABLE public.user_suspensions IS 'Tracks user account suspensions/bans';
COMMENT ON COLUMN public.user_suspensions.reason IS 'Public-facing reason shown to user';
COMMENT ON COLUMN public.user_suspensions.internal_notes IS 'Private admin notes not shown to user';
COMMENT ON COLUMN public.user_suspensions.expires_at IS 'NULL = permanent, otherwise auto-unsuspend at this time';

-- =====================================================
-- 2. ADD SUSPENSION COLUMNS TO USERS TABLE
-- =====================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- Index for quick suspension checks
CREATE INDEX idx_users_suspended ON public.users(is_suspended) WHERE is_suspended = TRUE;

COMMENT ON COLUMN public.users.is_suspended IS 'Quick flag to check if user is currently suspended';
COMMENT ON COLUMN public.users.suspended_at IS 'When user was last suspended';

-- =====================================================
-- 3. HELPER FUNCTION: GET ACTIVE SUSPENSION
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_suspension(p_user_id UUID)
RETURNS TABLE (
  suspension_id UUID,
  reason TEXT,
  reason_category TEXT,
  suspended_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    us.id AS suspension_id,
    us.reason,
    us.reason_category,
    us.suspended_at,
    us.expires_at,
    (us.expires_at IS NULL) AS is_permanent
  FROM user_suspensions us
  WHERE us.user_id = p_user_id
    AND us.is_active = TRUE
    AND (us.expires_at IS NULL OR us.expires_at > NOW())
  ORDER BY us.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_suspension IS 'Gets the active suspension for a user if one exists';

-- =====================================================
-- 4. FUNCTION: CHECK IF USER IS SUSPENDED
-- =====================================================

CREATE OR REPLACE FUNCTION is_user_suspended(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_suspended BOOLEAN;
BEGIN
  SELECT
    EXISTS(
      SELECT 1
      FROM user_suspensions
      WHERE user_id = p_user_id
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
    )
  INTO v_suspended;

  RETURN v_suspended;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_user_suspended IS 'Quickly check if user has an active suspension';

-- =====================================================
-- 5. FUNCTION: AUTO-EXPIRE SUSPENSIONS (Cron Job)
-- =====================================================

CREATE OR REPLACE FUNCTION auto_expire_suspensions()
RETURNS TABLE (
  expired_count INTEGER,
  user_ids UUID[]
) AS $$
DECLARE
  v_expired_count INTEGER;
  v_user_ids UUID[];
BEGIN
  -- Find and deactivate expired suspensions
  WITH expired AS (
    UPDATE user_suspensions
    SET
      is_active = FALSE,
      unsuspended_at = NOW(),
      updated_at = NOW()
    WHERE is_active = TRUE
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
    RETURNING user_id
  ),
  updated_users AS (
    UPDATE users
    SET
      is_suspended = FALSE,
      suspended_at = NULL
    WHERE id IN (SELECT user_id FROM expired)
    RETURNING id
  )
  SELECT
    COUNT(*)::INTEGER,
    ARRAY_AGG(id)
  INTO v_expired_count, v_user_ids
  FROM updated_users;

  RETURN QUERY SELECT v_expired_count, v_user_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION auto_expire_suspensions IS 'Auto-expires temporary suspensions. Run daily via cron.';

-- =====================================================
-- 6. TRIGGER: UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_suspensions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_suspensions_updated_at
  BEFORE UPDATE ON public.user_suspensions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_suspensions_updated_at();

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

-- Admins can view all suspensions
CREATE POLICY "Admins can view all suspensions"
  ON public.user_suspensions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert suspensions
CREATE POLICY "Admins can create suspensions"
  ON public.user_suspensions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update suspensions (for unsuspending)
CREATE POLICY "Admins can update suspensions"
  ON public.user_suspensions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_active_suspension(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_suspended(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_expire_suspensions() TO service_role;
