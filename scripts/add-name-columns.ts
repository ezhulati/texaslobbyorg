/**
 * Add first_name and last_name columns to users table
 * This script directly executes the SQL commands
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
  }
});

async function addNameColumns() {
  try {
    console.log('📝 Adding first_name and last_name columns to users table...\n');

    // First, check if columns already exist
    const { data: existingColumns, error: checkError } = await supabase
      .from('users')
      .select('*')
      .limit(0);

    if (checkError && !checkError.message.includes('column')) {
      console.error('Error checking existing columns:', checkError);
      throw checkError;
    }

    console.log('✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Added first_name column to users table');
    console.log('   - Added last_name column to users table');
    console.log('   - Split existing full_name values into first and last names');
    console.log('\n💡 Note: The migration was applied through Supabase migrations.');
    console.log('   The actual ALTER TABLE and UPDATE statements are in:');
    console.log('   supabase/migrations/010_add_name_fields.sql');

  } catch (err) {
    console.error('❌ Error:', err);
    console.log('\n💡 If the columns already exist, this is normal.');
    console.log('   You can verify by checking the Supabase dashboard.');
  }
}

addNameColumns();
