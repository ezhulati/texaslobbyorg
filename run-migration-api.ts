import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

console.log('Applying migration to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('\nExecuting migration statements...\n');

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
      name: 'Set default tag_type',
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
    try {
      console.log(`- ${stmt.name}...`);
      // Execute using raw SQL
      const { error } = await supabase.rpc('exec', { sql: stmt.sql });
      
      if (error) {
        console.log(`  ⚠️  ${error.message}`);
      } else {
        console.log(`  ✓ Success`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${err}`);
    }
  }

  // Verify the columns exist
  console.log('\nVerifying columns...');
  const { data, error } = await supabase
    .from('bill_tags')
    .select('*')
    .limit(1);

  if (!error && data) {
    console.log('✓ bill_tags table is accessible');
    
    // Try to insert a test record to verify schema
    const testInsert = await supabase
      .from('bill_tags')
      .insert({
        bill_id: '00000000-0000-0000-0000-000000000000',
        lobbyist_id: '00000000-0000-0000-0000-000000000000',
        tag_type: 'monitoring',
        is_public: true,
        notes: 'test'
      })
      .select();
    
    if (testInsert.error) {
      if (testInsert.error.code === '23503') {
        console.log('✓ Schema updated correctly (foreign key constraint working)');
      } else {
        console.log('Test insert error:', testInsert.error.message);
      }
    } else {
      console.log('✓ Test insert successful - cleaning up...');
      await supabase
        .from('bill_tags')
        .delete()
        .eq('bill_id', '00000000-0000-0000-0000-000000000000');
    }
  }

  console.log('\nMigration process complete!');
}

runMigration();
