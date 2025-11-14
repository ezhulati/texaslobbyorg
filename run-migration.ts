import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://ntyzdtqilbxmjbwylfhx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running bill_tags migration...\n');

  const statements = [
    {
      name: 'Add tag_type column',
      sql: `ALTER TABLE bill_tags ADD COLUMN IF NOT EXISTS tag_type TEXT CHECK (tag_type IN ('supporting', 'monitoring', 'opposing'));`
    },
    {
      name: 'Add is_public column',
      sql: `ALTER TABLE bill_tags ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;`
    },
    {
      name: 'Update existing rows',
      sql: `UPDATE bill_tags SET tag_type = 'monitoring' WHERE tag_type IS NULL;`
    },
    {
      name: 'Make tag_type NOT NULL',
      sql: `ALTER TABLE bill_tags ALTER COLUMN tag_type SET NOT NULL;`
    },
    {
      name: 'Add index on is_public',
      sql: `CREATE INDEX IF NOT EXISTS idx_bill_tags_is_public ON bill_tags(is_public) WHERE is_public = true;`
    },
    {
      name: 'Add index on tag_type',
      sql: `CREATE INDEX IF NOT EXISTS idx_bill_tags_tag_type ON bill_tags(tag_type);`
    }
  ];

  for (const stmt of statements) {
    console.log(`- ${stmt.name}...`);
    const { error } = await supabase.rpc('exec', { query: stmt.sql });
    if (error) {
      // Try direct query instead
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: stmt.sql })
      });
      
      if (!response.ok) {
        console.error(`  ✗ Failed: ${response.statusText}`);
      } else {
        console.log(`  ✓ Success`);
      }
    } else {
      console.log(`  ✓ Success`);
    }
  }

  console.log('\nMigration complete!');
}

runMigration();
