-- Add is_verified field to lobbyists table
-- This tracks admin approval status for premium features

ALTER TABLE public.lobbyists
ADD COLUMN is_verified BOOLEAN DEFAULT false;

-- Comment on the field
COMMENT ON COLUMN public.lobbyists.is_verified IS 'Admin has verified this lobbyist for premium features (featured placement, top search results, etc.)';

-- Update existing profiles based on current status
-- Any profile that is active and not pending gets auto-verified (grandfather existing profiles)
UPDATE public.lobbyists
SET is_verified = true
WHERE is_active = true AND is_pending = false;

-- Create index for faster queries filtering by verified status
CREATE INDEX idx_lobbyists_verified ON public.lobbyists(is_verified) WHERE is_verified = true;
