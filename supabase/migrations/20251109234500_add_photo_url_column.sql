-- Add photo_url column to lobbyists table for storing profile photo URLs
ALTER TABLE public.lobbyists
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.lobbyists.photo_url IS 'URL to profile photo stored in Supabase Storage (profile-photos bucket)';

-- Create index for queries filtering by photo presence
CREATE INDEX IF NOT EXISTS idx_lobbyists_photo_url ON public.lobbyists(photo_url) WHERE photo_url IS NOT NULL;
