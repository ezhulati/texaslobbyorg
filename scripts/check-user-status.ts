/**
 * Check if a user exists in the database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const email = process.argv[2];

if (!email) {
  console.error('Usage: npx tsx scripts/check-user-status.ts email@example.com');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkUser() {
  console.log(`\n🔍 Checking user: ${email}\n`);

  // Check in public.users table
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (publicError && publicError.code !== 'PGRST116') {
    console.error('Error checking public.users:', publicError);
  }

  if (publicUser) {
    console.log('✅ Found in public.users table:');
    console.log('   ID:', publicUser.id);
    console.log('   Email:', publicUser.email);
    console.log('   First Name:', publicUser.first_name);
    console.log('   Last Name:', publicUser.last_name);
    console.log('   Role:', publicUser.role);
    console.log('   Created:', publicUser.created_at);
  } else {
    console.log('❌ NOT found in public.users table');
  }

  // Check auth.users via admin API
  console.log('\n📧 Checking Supabase Auth (auth.users):');

  try {
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return;
    }

    const authUser = users?.find(u => u.email === email);

    if (authUser) {
      console.log('✅ Found in auth.users:');
      console.log('   ID:', authUser.id);
      console.log('   Email:', authUser.email);
      console.log('   Email Confirmed:', authUser.email_confirmed_at ? 'YES' : 'NO');
      console.log('   Confirmed At:', authUser.email_confirmed_at || 'Not confirmed');
      console.log('   Created:', authUser.created_at);
      console.log('   Last Sign In:', authUser.last_sign_in_at || 'Never');

      if (!authUser.email_confirmed_at) {
        console.log('\n⚠️  Email is NOT confirmed!');
        console.log('   The user needs to verify their email or you need to disable email confirmation.');
      }
    } else {
      console.log('❌ NOT found in auth.users');
      console.log('   Signup may have failed silently');
    }
  } catch (err) {
    console.error('Error checking auth.users:', err);
  }
}

checkUser();
