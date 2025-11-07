/**
 * Fix RLS policy - add INSERT policy for users table
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function fixPolicy() {
  console.log('\n🔧 Fixing RLS policy for users table...\n');

  const sql = `
    CREATE POLICY "Users can insert own profile" ON public.users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  `;

  console.log('Executing SQL:', sql);

  try {
    // Use raw SQL query
    const { data, error } = await supabase.rpc('exec_sql', { sql: sql.trim() });

    if (error) {
      console.error('❌ Error:', error);
      console.log('\n⚠️  Please apply this SQL manually in Supabase Dashboard → SQL Editor:');
      console.log(sql);
      process.exit(1);
    }

    console.log('✅ Policy created successfully!');
    console.log('   Users can now INSERT their own records during login/signup');

  } catch (err: any) {
    console.error('❌ Unexpected error:', err?.message || err);
    console.log('\n⚠️  Please apply this SQL manually in Supabase Dashboard → SQL Editor:');
    console.log(sql);
    process.exit(1);
  }
}

fixPolicy();
