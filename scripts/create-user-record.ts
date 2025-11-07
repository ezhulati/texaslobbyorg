/**
 * Manually create a user record in public.users
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUserRecord() {
  const userId = '7f96e6cc-dae4-42f0-89e1-398f094d717b';
  const email = 'enrizhulati@gmail.com';

  console.log('\n📝 Creating user record in public.users...\n');

  const { data, error } = await supabase.from('users').upsert({
    id: userId,
    email: email,
    role: 'searcher',
    full_name: 'Enri Zhulati',
  });

  if (error) {
    console.error('❌ Error creating user record:', error);
    process.exit(1);
  }

  console.log('✅ User record created successfully!');
  console.log('\n📋 User details:');
  console.log('   ID:', userId);
  console.log('   Email:', email);
  console.log('   Role: searcher');
  console.log('\n✨ You should now be able to access /dashboard');
}

createUserRecord();
