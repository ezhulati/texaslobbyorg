-- Add missing columns to bill_tags table for lobbyist tagging feature

-- Add tag_type column (supporting, monitoring, opposing)
ALTER TABLE bill_tags
ADD COLUMN IF NOT EXISTS tag_type TEXT CHECK (tag_type IN ('supporting', 'monitoring', 'opposing'));

-- Add is_public column (default to true for public visibility)
ALTER TABLE bill_tags
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;

-- Rename context_notes to notes for consistency
ALTER TABLE bill_tags
RENAME COLUMN context_notes TO notes;

-- Update existing rows to have default tag_type
UPDATE bill_tags SET tag_type = 'monitoring' WHERE tag_type IS NULL;

-- Make tag_type NOT NULL after setting defaults
ALTER TABLE bill_tags
ALTER COLUMN tag_type SET NOT NULL;

-- Add index for filtering public tags
CREATE INDEX IF NOT EXISTS idx_bill_tags_is_public ON bill_tags(is_public) WHERE is_public = true;

-- Add index for filtering by tag_type
CREATE INDEX IF NOT EXISTS idx_bill_tags_tag_type ON bill_tags(tag_type);
