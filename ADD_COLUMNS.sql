-- Simple migration to add missing columns to bill_tags table
-- Run this in Supabase Dashboard > SQL Editor

-- Add tag_type column (supporting, monitoring, opposing)
ALTER TABLE bill_tags
ADD COLUMN IF NOT EXISTS tag_type TEXT DEFAULT 'monitoring' NOT NULL
CHECK (tag_type IN ('supporting', 'monitoring', 'opposing'));

-- Add is_public column (default to true for public visibility)
ALTER TABLE bill_tags
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bill_tags_is_public
ON bill_tags(is_public) WHERE is_public = true;

CREATE INDEX IF NOT EXISTS idx_bill_tags_tag_type
ON bill_tags(tag_type);

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'bill_tags'
AND column_name IN ('tag_type', 'is_public', 'context_notes')
ORDER BY column_name;
