-- Migration 019: Add Profile Rejection System
-- Adds comprehensive rejection tracking and resubmission management

-- ============================================================================
-- PART 1: Add rejection tracking fields to lobbyists table
-- ============================================================================

-- Add rejection category enum type
DO $$ BEGIN
  CREATE TYPE rejection_category AS ENUM (
    'invalid_id',
    'incomplete_info',
    'duplicate_profile',
    'not_registered_lobbyist',
    'fake_profile',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add rejection tracking columns
ALTER TABLE public.lobbyists
ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_category rejection_category,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_resubmission_at TIMESTAMPTZ;

-- ============================================================================
-- PART 2: Create indexes for query performance
-- ============================================================================

-- Index for finding rejected profiles
CREATE INDEX IF NOT EXISTS idx_lobbyists_is_rejected
ON public.lobbyists(is_rejected)
WHERE is_rejected = TRUE;

-- Index for admin audit trail
CREATE INDEX IF NOT EXISTS idx_lobbyists_rejected_by
ON public.lobbyists(rejected_by)
WHERE rejected_by IS NOT NULL;

-- Index for rejection analytics
CREATE INDEX IF NOT EXISTS idx_lobbyists_rejected_at
ON public.lobbyists(rejected_at)
WHERE rejected_at IS NOT NULL;

-- Composite index for resubmission eligibility checks
CREATE INDEX IF NOT EXISTS idx_lobbyists_rejection_status
ON public.lobbyists(is_rejected, rejection_count, last_resubmission_at)
WHERE is_rejected = TRUE;

-- ============================================================================
-- PART 3: Helper functions for rejection management
-- ============================================================================

-- Function to check if user can resubmit (not exceeded max attempts)
CREATE OR REPLACE FUNCTION can_user_resubmit(lobbyist_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  max_rejections CONSTANT INTEGER := 3;
  current_count INTEGER;
BEGIN
  SELECT rejection_count INTO current_count
  FROM public.lobbyists
  WHERE id = lobbyist_uuid;

  RETURN current_count < max_rejections;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check resubmission cooldown (24 hours)
CREATE OR REPLACE FUNCTION is_resubmission_cooldown_elapsed(lobbyist_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  cooldown_hours CONSTANT INTEGER := 24;
  last_resubmit TIMESTAMPTZ;
BEGIN
  SELECT last_resubmission_at INTO last_resubmit
  FROM public.lobbyists
  WHERE id = lobbyist_uuid;

  -- If never resubmitted, cooldown is elapsed
  IF last_resubmit IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Check if 24 hours have passed
  RETURN (NOW() - last_resubmit) > (cooldown_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get rejection statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_rejection_stats(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  category rejection_category,
  count BIGINT,
  avg_attempts NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rejection_category as category,
    COUNT(*) as count,
    ROUND(AVG(rejection_count), 2) as avg_attempts
  FROM public.lobbyists
  WHERE rejected_at > NOW() - (days_back || ' days')::INTERVAL
    AND rejection_category IS NOT NULL
  GROUP BY rejection_category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: Update RLS policies (if needed)
-- ============================================================================

-- Users can view their own rejected profiles
-- (This should already be covered by existing user_id policies, but adding explicit check)

-- No additional RLS changes needed - existing policies on lobbyists table handle this

-- ============================================================================
-- PART 5: Comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.lobbyists.is_rejected IS 'TRUE if profile has been rejected by admin (distinct from pending/active)';
COMMENT ON COLUMN public.lobbyists.rejection_reason IS 'User-facing explanation of why profile was rejected';
COMMENT ON COLUMN public.lobbyists.rejection_category IS 'Category of rejection for analytics and templating';
COMMENT ON COLUMN public.lobbyists.rejected_at IS 'Timestamp when profile was rejected';
COMMENT ON COLUMN public.lobbyists.rejected_by IS 'Admin user ID who rejected the profile';
COMMENT ON COLUMN public.lobbyists.rejection_count IS 'Number of times this profile has been rejected (max 3)';
COMMENT ON COLUMN public.lobbyists.last_resubmission_at IS 'Timestamp of most recent resubmission (for cooldown enforcement)';

COMMENT ON FUNCTION can_user_resubmit IS 'Check if user has not exceeded max rejection count (3 attempts)';
COMMENT ON FUNCTION is_resubmission_cooldown_elapsed IS 'Check if 24 hours have passed since last resubmission';
COMMENT ON FUNCTION get_rejection_stats IS 'Get rejection statistics by category for admin analytics';
