-- Migration: Add Admin Audit Log
-- Description: Tracks all admin actions for accountability and security
-- Created: 2025-11-08

-- =====================================================
-- 1. CREATE AUDIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who performed the action
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,

  -- What action was performed
  action_type TEXT NOT NULL CHECK (action_type IN (
    'user_created',
    'user_updated',
    'user_deleted',
    'user_promoted',
    'user_demoted',
    'user_suspended',
    'user_unsuspended',
    'profile_approved',
    'profile_rejected',
    'profile_updated',
    'profile_deleted',
    'settings_changed',
    'bulk_action',
    'impersonation_started',
    'impersonation_ended',
    'other'
  )),

  -- Target of the action (if applicable)
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_email TEXT,

  -- Action details
  action_description TEXT NOT NULL,
  action_metadata JSONB, -- Stores additional context (old values, new values, etc.)

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_target_user_id ON public.admin_audit_log(target_user_id);
CREATE INDEX idx_audit_log_action_type ON public.admin_audit_log(action_type);
CREATE INDEX idx_audit_log_created_at ON public.admin_audit_log(created_at DESC);

-- Comments
COMMENT ON TABLE public.admin_audit_log IS 'Tracks all administrative actions for security and accountability';
COMMENT ON COLUMN public.admin_audit_log.action_type IS 'Type of action performed';
COMMENT ON COLUMN public.admin_audit_log.action_metadata IS 'JSON object with additional context about the action';

-- =====================================================
-- 2. HELPER FUNCTION: LOG ADMIN ACTION
-- =====================================================

CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_action_type TEXT,
  p_action_description TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_admin_email TEXT;
  v_target_email TEXT;
  v_log_id UUID;
BEGIN
  -- Get admin email
  SELECT email INTO v_admin_email
  FROM users
  WHERE id = p_admin_id;

  -- Get target user email if applicable
  IF p_target_user_id IS NOT NULL THEN
    SELECT email INTO v_target_email
    FROM users
    WHERE id = p_target_user_id;
  END IF;

  -- Insert audit log entry
  INSERT INTO admin_audit_log (
    admin_id,
    admin_email,
    action_type,
    target_user_id,
    target_user_email,
    action_description,
    action_metadata,
    ip_address,
    user_agent
  ) VALUES (
    p_admin_id,
    v_admin_email,
    p_action_type,
    p_target_user_id,
    v_target_email,
    p_action_description,
    p_metadata,
    p_ip_address::INET,
    p_user_agent
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_admin_action IS 'Helper function to log admin actions consistently';

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.admin_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can insert audit logs (via function)
CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION log_admin_action(UUID, TEXT, TEXT, UUID, JSONB, TEXT, TEXT) TO authenticated;
