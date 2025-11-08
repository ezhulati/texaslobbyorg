-- Add soft delete system with grace period for account recovery
-- Best practice: 30-day grace period before permanent deletion

-- Add deleted_at and deletion fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_scheduled_for TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_users_deletion_scheduled
ON public.users(deletion_scheduled_for)
WHERE deletion_scheduled_for IS NOT NULL;

-- Create table to track account deletion requests for audit
CREATE TABLE IF NOT EXISTS public.account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_role TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_date TIMESTAMPTZ NOT NULL,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  data_export_url TEXT,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding pending deletions
CREATE INDEX IF NOT EXISTS idx_account_deletions_scheduled
ON public.account_deletions(scheduled_deletion_date)
WHERE completed_at IS NULL AND cancelled_at IS NULL;

-- Enable RLS
ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own deletion records
CREATE POLICY "Users can view own deletion records"
ON public.account_deletions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Service role can do anything (for cleanup jobs)
CREATE POLICY "Service role full access to deletions"
ON public.account_deletions
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Function to mark user for deletion (soft delete)
CREATE OR REPLACE FUNCTION mark_user_for_deletion(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_grace_period_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_scheduled_date TIMESTAMPTZ;
  v_user_email TEXT;
  v_user_role TEXT;
  v_deletion_id UUID;
BEGIN
  -- Calculate deletion date (grace period)
  v_scheduled_date := NOW() + (p_grace_period_days || ' days')::INTERVAL;

  -- Get user details
  SELECT email, role INTO v_user_email, v_user_role
  FROM public.users
  WHERE id = p_user_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Check if already scheduled for deletion
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
    AND deleted_at IS NOT NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account already marked for deletion');
  END IF;

  -- Mark user as deleted (soft delete)
  UPDATE public.users
  SET
    deleted_at = NOW(),
    deletion_scheduled_for = v_scheduled_date,
    deletion_reason = p_reason
  WHERE id = p_user_id;

  -- Create audit record
  INSERT INTO public.account_deletions (
    user_id,
    email,
    user_role,
    scheduled_deletion_date,
    reason
  ) VALUES (
    p_user_id,
    v_user_email,
    v_user_role,
    v_scheduled_date,
    p_reason
  ) RETURNING id INTO v_deletion_id;

  RETURN jsonb_build_object(
    'success', true,
    'deletion_id', v_deletion_id,
    'scheduled_date', v_scheduled_date,
    'grace_period_days', p_grace_period_days
  );
END;
$$;

-- Function to cancel account deletion (recovery)
CREATE OR REPLACE FUNCTION cancel_account_deletion(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deletion_id UUID;
BEGIN
  -- Check if user is marked for deletion
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id
    AND deleted_at IS NOT NULL
    AND deletion_scheduled_for > NOW()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending deletion found or grace period expired');
  END IF;

  -- Restore user account
  UPDATE public.users
  SET
    deleted_at = NULL,
    deletion_scheduled_for = NULL,
    deletion_reason = NULL
  WHERE id = p_user_id;

  -- Mark deletion as cancelled in audit log
  UPDATE public.account_deletions
  SET cancelled_at = NOW()
  WHERE user_id = p_user_id
    AND completed_at IS NULL
    AND cancelled_at IS NULL
  RETURNING id INTO v_deletion_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account deletion cancelled',
    'deletion_id', v_deletion_id
  );
END;
$$;

-- Function to permanently delete user (called after grace period)
CREATE OR REPLACE FUNCTION permanently_delete_user(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email TEXT;
  v_deletion_count INTEGER;
BEGIN
  -- Get email before deletion
  SELECT email INTO v_email
  FROM public.users
  WHERE id = p_user_id;

  IF v_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Delete from users table (cascades to favorites, page_views, etc.)
  DELETE FROM public.users WHERE id = p_user_id;

  GET DIAGNOSTICS v_deletion_count = ROW_COUNT;

  IF v_deletion_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Mark deletion as completed in audit log
  UPDATE public.account_deletions
  SET completed_at = NOW()
  WHERE user_id = p_user_id
    AND completed_at IS NULL;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User permanently deleted',
    'email', v_email
  );
END;
$$;

-- Function to clean up expired accounts (to be called by scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_accounts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_record RECORD;
  v_deleted_count INTEGER := 0;
  v_failed_count INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Find all users whose grace period has expired
  FOR v_user_record IN
    SELECT id, email
    FROM public.users
    WHERE deleted_at IS NOT NULL
      AND deletion_scheduled_for IS NOT NULL
      AND deletion_scheduled_for <= NOW()
  LOOP
    BEGIN
      -- Permanently delete the user
      SELECT permanently_delete_user(v_user_record.id) INTO v_result;

      IF (v_result->>'success')::BOOLEAN THEN
        v_deleted_count := v_deleted_count + 1;
      ELSE
        v_failed_count := v_failed_count + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
      -- Log error but continue processing
      RAISE WARNING 'Failed to delete user %: %', v_user_record.email, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'failed_count', v_failed_count,
    'timestamp', NOW()
  );
END;
$$;

-- Update existing queries to exclude soft-deleted users
-- Note: This is a helper view, not a replacement for the table
CREATE OR REPLACE VIEW public.active_users AS
SELECT *
FROM public.users
WHERE deleted_at IS NULL;

COMMENT ON TABLE public.account_deletions IS 'Audit trail for account deletion requests with 30-day grace period';
COMMENT ON COLUMN public.users.deleted_at IS 'Timestamp when user requested account deletion (soft delete)';
COMMENT ON COLUMN public.users.deletion_scheduled_for IS 'Date when account will be permanently deleted (after grace period)';
COMMENT ON COLUMN public.users.deletion_reason IS 'Optional reason provided by user for account deletion';
