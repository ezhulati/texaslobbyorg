-- Migration: Add User Impersonation System
-- Description: Allows admins to temporarily view the platform as another user for support
-- Created: 2025-11-08

-- =====================================================
-- 1. CREATE IMPERSONATION SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is impersonating
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_email TEXT NOT NULL,

  -- Who is being impersonated
  target_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_email TEXT NOT NULL,

  -- Session details
  reason TEXT NOT NULL CHECK (length(reason) >= 10),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Session token (stored in cookie)
  session_token TEXT NOT NULL UNIQUE,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_impersonation_admin_id ON public.impersonation_sessions(admin_id);
CREATE INDEX idx_impersonation_target_user_id ON public.impersonation_sessions(target_user_id);
CREATE INDEX idx_impersonation_session_token ON public.impersonation_sessions(session_token);
CREATE INDEX idx_impersonation_active ON public.impersonation_sessions(is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE public.impersonation_sessions IS 'Tracks admin impersonation sessions for support purposes';
COMMENT ON COLUMN public.impersonation_sessions.reason IS 'Why the admin is impersonating this user';
COMMENT ON COLUMN public.impersonation_sessions.session_token IS 'Unique token stored in cookie to track impersonation';

-- =====================================================
-- 2. TRIGGER: UPDATE TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_impersonation_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_impersonation_sessions_updated_at
  BEFORE UPDATE ON public.impersonation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_impersonation_sessions_updated_at();

-- =====================================================
-- 3. FUNCTION: START IMPERSONATION
-- =====================================================

CREATE OR REPLACE FUNCTION start_impersonation(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_reason TEXT
)
RETURNS TABLE (
  session_id UUID,
  session_token TEXT,
  target_email TEXT
) AS $$
DECLARE
  v_admin_email TEXT;
  v_target_email TEXT;
  v_session_id UUID;
  v_session_token TEXT;
BEGIN
  -- Validate reason
  IF length(p_reason) < 10 THEN
    RAISE EXCEPTION 'Impersonation reason must be at least 10 characters';
  END IF;

  -- Get admin email
  SELECT email INTO v_admin_email
  FROM users
  WHERE id = p_admin_id AND role = 'admin';

  IF v_admin_email IS NULL THEN
    RAISE EXCEPTION 'Admin user not found or not authorized';
  END IF;

  -- Get target user email
  SELECT email INTO v_target_email
  FROM users
  WHERE id = p_target_user_id;

  IF v_target_email IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  -- Prevent self-impersonation
  IF p_admin_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot impersonate yourself';
  END IF;

  -- End any existing active sessions for this admin
  UPDATE impersonation_sessions
  SET is_active = FALSE, ended_at = NOW()
  WHERE admin_id = p_admin_id AND is_active = TRUE;

  -- Generate session token
  v_session_token := encode(gen_random_bytes(32), 'hex');

  -- Create new impersonation session
  INSERT INTO impersonation_sessions (
    admin_id,
    admin_email,
    target_user_id,
    target_user_email,
    reason,
    session_token
  ) VALUES (
    p_admin_id,
    v_admin_email,
    p_target_user_id,
    v_target_email,
    p_reason,
    v_session_token
  )
  RETURNING id INTO v_session_id;

  -- Log audit trail
  PERFORM log_admin_action(
    p_admin_id,
    'impersonation_started',
    format('Started impersonating user %s', v_target_email),
    p_target_user_id,
    jsonb_build_object('reason', p_reason)
  );

  RETURN QUERY SELECT v_session_id, v_session_token, v_target_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION start_impersonation IS 'Starts an impersonation session for an admin';

-- =====================================================
-- 4. FUNCTION: END IMPERSONATION
-- =====================================================

CREATE OR REPLACE FUNCTION end_impersonation(p_session_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Get session details
  SELECT * INTO v_session
  FROM impersonation_sessions
  WHERE session_token = p_session_token
  AND is_active = TRUE;

  IF v_session IS NULL THEN
    RETURN FALSE;
  END IF;

  -- End session
  UPDATE impersonation_sessions
  SET is_active = FALSE, ended_at = NOW()
  WHERE id = v_session.id;

  -- Log audit trail
  PERFORM log_admin_action(
    v_session.admin_id,
    'impersonation_ended',
    format('Ended impersonation of user %s', v_session.target_user_email),
    v_session.target_user_id,
    jsonb_build_object(
      'duration_minutes', EXTRACT(EPOCH FROM (NOW() - v_session.started_at)) / 60
    )
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION end_impersonation IS 'Ends an active impersonation session';

-- =====================================================
-- 5. FUNCTION: GET ACTIVE IMPERSONATION
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_impersonation(p_session_token TEXT)
RETURNS TABLE (
  session_id UUID,
  admin_id UUID,
  admin_email TEXT,
  target_user_id UUID,
  target_user_email TEXT,
  reason TEXT,
  started_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    id,
    imp.admin_id,
    admin_email,
    target_user_id,
    target_user_email,
    imp.reason,
    imp.started_at
  FROM impersonation_sessions imp
  WHERE session_token = p_session_token
  AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_impersonation IS 'Gets details of an active impersonation session';

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Admins can view all impersonation sessions
CREATE POLICY "Admins can view all impersonation sessions"
  ON public.impersonation_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert impersonation sessions (via function)
CREATE POLICY "Admins can insert impersonation sessions"
  ON public.impersonation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update their own impersonation sessions
CREATE POLICY "Admins can update impersonation sessions"
  ON public.impersonation_sessions
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
-- 7. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION start_impersonation(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION end_impersonation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_impersonation(TEXT) TO authenticated;
