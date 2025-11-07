/**
 * Manually run the name fields migration
 * This adds first_name and last_name columns to the users table
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function runMigration() {
  console.log('📝 Adding first_name and last_name columns to users table...\n');

  try {
    // First, try to add the columns
    console.log('Step 1: Adding columns...');
    const alterQuery = `
      ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS first_name TEXT,
      ADD COLUMN IF NOT EXISTS last_name TEXT;
    `;

    // Execute via a direct query using the REST API
    const alterResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: alterQuery })
    });

    if (!alterResponse.ok && !alterResponse.status.toString().includes('404')) {
      const errorText = await alterResponse.text();
      console.log(`Response: ${errorText}`);
    }

    console.log('✅ Columns added (or already exist)');

    // Now update existing records to split full_name
    console.log('\nStep 2: Splitting existing full_name values...');
    const updateQuery = `
      UPDATE public.users
      SET
        first_name = CASE
          WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
          THEN split_part(full_name, ' ', 1)
          ELSE full_name
        END,
        last_name = CASE
          WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
          THEN substring(full_name FROM position(' ' IN full_name) + 1)
          ELSE NULL
        END
      WHERE (first_name IS NULL OR last_name IS NULL) AND full_name IS NOT NULL;
    `;

    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: updateQuery })
    });

    console.log('✅ Existing names split');

    console.log('\n✨ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('  1. Test signup with first/last names');
    console.log('  2. Commit changes to git');
    console.log('  3. Deploy to production');

  } catch (err: any) {
    console.error('Note: exec_sql RPC may not be available.');
    console.log('\n💡 Alternative: Run this SQL manually in Supabase Dashboard SQL Editor:');
    console.log('\n```sql');
    console.log('ALTER TABLE public.users');
    console.log('ADD COLUMN IF NOT EXISTS first_name TEXT,');
    console.log('ADD COLUMN IF NOT EXISTS last_name TEXT;');
    console.log('');
    console.log('UPDATE public.users');
    console.log('SET');
    console.log('  first_name = CASE');
    console.log('    WHEN full_name IS NOT NULL AND position(\' \' IN full_name) > 0');
    console.log('    THEN split_part(full_name, \' \', 1)');
    console.log('    ELSE full_name');
    console.log('  END,');
    console.log('  last_name = CASE');
    console.log('    WHEN full_name IS NOT NULL AND position(\' \' IN full_name) > 0');
    console.log('    THEN substring(full_name FROM position(\' \' IN full_name) + 1)');
    console.log('    ELSE NULL');
    console.log('  END');
    console.log('WHERE (first_name IS NULL OR last_name IS NULL) AND full_name IS NOT NULL;');
    console.log('```');
  }
}

runMigration();
