-- Add onboarding tracking and pending profile approval fields

-- Add columns to lobbyists table
ALTER TABLE public.lobbyists
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pending BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pending_reason TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add index for pending profiles
CREATE INDEX IF NOT EXISTS idx_lobbyists_is_pending ON public.lobbyists(is_pending) WHERE is_pending = TRUE;

-- Add index for incomplete onboarding
CREATE INDEX IF NOT EXISTS idx_lobbyists_onboarding ON public.lobbyists(onboarding_completed) WHERE onboarding_completed = FALSE;

-- Update RLS policies to handle pending profiles
-- Admins can see pending profiles, but they're hidden from public view
ALTER TABLE public.lobbyists ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and recreate
DROP POLICY IF EXISTS "Public can view active, non-pending lobbyists" ON public.lobbyists;
CREATE POLICY "Public can view active, non-pending lobbyists"
  ON public.lobbyists FOR SELECT
  USING (is_active = TRUE AND is_pending = FALSE);

-- Lobbyists can view their own profile even if pending
DROP POLICY IF EXISTS "Lobbyists can view own profile" ON public.lobbyists;
CREATE POLICY "Lobbyists can view own profile"
  ON public.lobbyists FOR SELECT
  USING (auth.uid() = user_id);

-- Lobbyists can update their own profile
DROP POLICY IF EXISTS "Lobbyists can update own profile" ON public.lobbyists;
CREATE POLICY "Lobbyists can update own profile"
  ON public.lobbyists FOR UPDATE
  USING (auth.uid() = user_id);

COMMENT ON COLUMN public.lobbyists.onboarding_completed IS 'Whether the lobbyist has completed the onboarding flow';
COMMENT ON COLUMN public.lobbyists.onboarding_step IS 'Current step in onboarding (0-5): 0=not started, 1=photo, 2=bio, 3=contact, 4=clients, 5=plan';
COMMENT ON COLUMN public.lobbyists.is_pending IS 'Whether the profile is awaiting admin approval (for new profiles not from TEC data)';
COMMENT ON COLUMN public.lobbyists.pending_reason IS 'Why this profile needs approval (e.g., "New lobbyist registration")';
