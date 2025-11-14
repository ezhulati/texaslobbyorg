-- Add separate visibility control for lobbyist profiles
ALTER TABLE bill_tags
ADD COLUMN IF NOT EXISTS show_on_profile BOOLEAN DEFAULT true NOT NULL;

-- Index for public profile tags
CREATE INDEX IF NOT EXISTS idx_bill_tags_show_on_profile
ON bill_tags(show_on_profile)
WHERE show_on_profile = true;
