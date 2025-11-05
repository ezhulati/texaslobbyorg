-- Add linkedin_url field to lobbyists table
ALTER TABLE public.lobbyists ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.lobbyists.linkedin_url IS 'LinkedIn profile URL for the lobbyist';
