/**
 * Apply INSERT policy for users table
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyPolicy() {
  console.log('\n🔧 Applying INSERT policy for users table...\n');

  const sql = readFileSync('supabase/migrations/011_add_user_insert_policy.sql', 'utf-8');

  const { error } = await supabase.rpc('exec_sql', { sql_string: sql }).single();

  if (error) {
    // Try direct query if RPC doesn't work
    const lines = sql.split('\n').filter(line => !line.startsWith('--') && line.trim());
    const cleanSql = lines.join(' ').trim();

    const { error: directError } = await supabase.from('_sql').insert({ query: cleanSql });

    if (directError) {
      console.error('❌ Failed to apply policy:', directError);
      console.log('\n📝 Please run this SQL manually in Supabase Dashboard:');
      console.log(cleanSql);
      process.exit(1);
    }
  }

  console.log('✅ INSERT policy applied successfully!');
  console.log('   Users can now create their own user records during login/signup');
}

applyPolicy();
