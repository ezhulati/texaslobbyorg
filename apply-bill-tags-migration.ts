import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://ntyzdtqilbxmjbwylfhx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying bill_tags table migration...\n');

  // 1. Add tag_type column
  console.log('1. Adding tag_type column...');
  const { error: error1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE bill_tags ADD COLUMN IF NOT EXISTS tag_type TEXT CHECK (tag_type IN ('supporting', 'monitoring', 'opposing'));`
  });
  if (error1) console.error('Error 1:', error1);
  else console.log('   ✓ tag_type column added\n');

  // 2. Add is_public column
  console.log('2. Adding is_public column...');
  const { error: error2 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE bill_tags ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true NOT NULL;`
  });
  if (error2) console.error('Error 2:', error2);
  else console.log('   ✓ is_public column added\n');

  // 3. Update existing rows
  console.log('3. Setting default tag_type for existing rows...');
  const { error: error3 } = await supabase.rpc('exec_sql', {
    sql: `UPDATE bill_tags SET tag_type = 'monitoring' WHERE tag_type IS NULL;`
  });
  if (error3) console.error('Error 3:', error3);
  else console.log('   ✓ Defaults set\n');

  // 4. Make tag_type NOT NULL
  console.log('4. Making tag_type NOT NULL...');
  const { error: error4 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE bill_tags ALTER COLUMN tag_type SET NOT NULL;`
  });
  if (error4) console.error('Error 4:', error4);
  else console.log('   ✓ tag_type now required\n');

  // 5. Add indexes
  console.log('5. Adding indexes...');
  const { error: error5 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE INDEX IF NOT EXISTS idx_bill_tags_is_public ON bill_tags(is_public) WHERE is_public = true;
      CREATE INDEX IF NOT EXISTS idx_bill_tags_tag_type ON bill_tags(tag_type);
    `
  });
  if (error5) console.error('Error 5:', error5);
  else console.log('   ✓ Indexes added\n');

  console.log('Migration complete!');
}

applyMigration();
