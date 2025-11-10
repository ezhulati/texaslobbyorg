-- Add internal_notes column to lobbyists table for admin use
ALTER TABLE public.lobbyists
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

COMMENT ON COLUMN public.lobbyists.internal_notes IS 'Private admin notes about this lobbyist (never shown to public or lobbyist themselves)';
