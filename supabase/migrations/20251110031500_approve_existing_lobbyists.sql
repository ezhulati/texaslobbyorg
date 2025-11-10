-- Add approval_status column and approve all existing active lobbyists
-- This migration adds the approval_status field and sets it appropriately for existing lobbyists
-- New lobbyists will go through the normal approval process

-- Create approval_status enum type
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add approval_status column
ALTER TABLE public.lobbyists
ADD COLUMN IF NOT EXISTS approval_status approval_status;

-- Set approval_status based on existing state
-- Active lobbyists -> approved
-- Rejected lobbyists (is_rejected = true) -> rejected
-- Everything else -> pending
UPDATE public.lobbyists
SET approval_status = CASE
  WHEN is_active = TRUE AND (is_rejected IS FALSE OR is_rejected IS NULL) THEN 'approved'::approval_status
  WHEN is_rejected = TRUE THEN 'rejected'::approval_status
  ELSE 'pending'::approval_status
END
WHERE approval_status IS NULL;

-- Create index for approval status queries
CREATE INDEX IF NOT EXISTS idx_lobbyists_approval_status
ON public.lobbyists(approval_status);

COMMENT ON COLUMN public.lobbyists.approval_status IS 'Approval status for profile claims: pending, approved, or rejected';
COMMENT ON TABLE public.lobbyists IS 'All active lobbyists are automatically approved. New lobbyists go through approval process.';
