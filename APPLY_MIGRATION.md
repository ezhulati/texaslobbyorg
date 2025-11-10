# Apply Bill Tags Migration

The lobbyist tagging feature requires additional columns in the `bill_tags` table.

## Option 1: Via Supabase Dashboard (Recommended)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste this SQL:

```sql
-- Add tag_type column (supporting, monitoring, opposing)
ALTER TABLE bill_tags
ADD COLUMN IF NOT EXISTS tag_type TEXT CHECK (tag_type IN ('supporting', 'monitoring', 'opposing'));

-- Add is_public column (default to true for public visibility)
ALTER TABLE bill_tags
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;

-- Update existing rows to have default tag_type
UPDATE bill_tags SET tag_type = 'monitoring' WHERE tag_type IS NULL;

-- Make tag_type NOT NULL after setting defaults
ALTER TABLE bill_tags
ALTER COLUMN tag_type SET NOT NULL;

-- Add index for filtering public tags
CREATE INDEX IF NOT EXISTS idx_bill_tags_is_public ON bill_tags(is_public) WHERE is_public = true;

-- Add index for filtering by tag_type
CREATE INDEX IF NOT EXISTS idx_bill_tags_tag_type ON bill_tags(tag_type);
```

5. Click **Run**

## Option 2: Via psql (if you have connection string)

```bash
psql $DATABASE_URL < supabase/migrations/*_add_bill_tags_columns.sql
```

## After Migration

1. Open `scripts/set-lobbyist-auth.html` in your browser
2. Click "Set Lobbyist Auth" to log in as a lobbyist
3. Visit http://localhost:4321/bills
4. Click on any bill and test the "Tag This Bill" feature

## What This Migration Does

- Adds `tag_type` column: Stores whether lobbyist is supporting, monitoring, or opposing the bill
- Adds `is_public` column: Controls whether the tag appears on public bill pages
- Adds indexes: Improves query performance for filtering tags
- Sets defaults: Ensures existing data works with new schema
