-- Migration 018: Add ID Verification to New Profile Creation
-- Extends ID verification from claims to new profile submissions

-- ============================================================================
-- PART 1: Add ID verification field to lobbyists table
-- ============================================================================

ALTER TABLE public.lobbyists
ADD COLUMN IF NOT EXISTS id_verification_url TEXT;

-- Add index for quick filtering of profiles with/without ID verification
CREATE INDEX IF NOT EXISTS idx_lobbyists_id_verification ON public.lobbyists(id_verification_url) WHERE id_verification_url IS NOT NULL;

-- ============================================================================
-- PART 2: Comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.lobbyists.id_verification_url IS 'Supabase Storage URL for uploaded ID document (drivers license, passport, etc) for new profile verification';
