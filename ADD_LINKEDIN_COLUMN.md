# Add LinkedIn URL Column

## Database Migration Needed

To enable LinkedIn profile links for lobbyists, you need to add the `linkedin_url` column to the `lobbyists` table.

### Steps:

1. Go to Supabase Studio (https://supabase.com/dashboard/project/YOUR_PROJECT_ID/editor)
2. Click on "SQL Editor" in the left sidebar
3. Run the following SQL:

```sql
-- Add linkedin_url column to lobbyists table
ALTER TABLE public.lobbyists ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.lobbyists.linkedin_url IS 'LinkedIn profile URL for the lobbyist';
```

### After Adding the Column

Once the column is added, you can update Beverly C. Cornwell's LinkedIn:

```typescript
// Run this script to add Beverly's LinkedIn
npx tsx -e "
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { error } = await supabase
    .from('lobbyists')
    .update({ linkedin_url: 'https://www.linkedin.com/in/beverly-c-91a2821/' })
    .eq('slug', 'beverly-c-cornwell');

  if (error) console.error('Error:', error);
  else console.log('✓ Added LinkedIn URL for Beverly C. Cornwell');
})();
"
```

### Frontend Display

The profile page (`src/pages/lobbyists/[slug].astro`) has been updated to display LinkedIn links when they exist.
