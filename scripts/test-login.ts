/**
 * Test login functionality to diagnose issues
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY!;

const email = 'enrizhulati@gmail.com';
const password = process.argv[2];

if (!password) {
  console.error('Usage: npx tsx scripts/test-login.ts YOUR_PASSWORD');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  console.log(`\n🔐 Testing login for: ${email}\n`);

  try {
    // Step 1: Sign in
    console.log('Step 1: Calling signInWithPassword...');
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
      process.exit(1);
    }

    console.log('✅ Sign in successful!');
    console.log('   User ID:', data.user?.id);
    console.log('   Email:', data.user?.email);
    console.log('   Session:', data.session ? 'Created' : 'No session');

    if (data.session) {
      // Step 2: Get user metadata
      console.log('\nStep 2: Checking user metadata...');
      const firstName = data.user.user_metadata?.first_name || null;
      const lastName = data.user.user_metadata?.last_name || null;
      console.log('   First Name:', firstName);
      console.log('   Last Name:', lastName);

      // Step 3: Try upsert
      console.log('\nStep 3: Testing user record upsert...');
      const { error: upsertError } = await supabase.from('users').upsert({
        id: data.user.id,
        email: data.user.email!,
        role: 'searcher',
        full_name: firstName && lastName ? `${firstName} ${lastName}`.trim() : null,
      });

      if (upsertError) {
        console.error('❌ Upsert failed:', upsertError);
        console.error('   This might prevent login redirect');
      } else {
        console.log('✅ Upsert successful!');
      }

      // Step 4: Verify user record
      console.log('\nStep 4: Verifying user record...');
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch user record:', fetchError);
      } else {
        console.log('✅ User record found:');
        console.log('   ID:', userData.id);
        console.log('   Email:', userData.email);
        console.log('   Role:', userData.role);
        console.log('   Full Name:', userData.full_name);
        console.log('   First Name:', userData.first_name);
        console.log('   Last Name:', userData.last_name);
      }
    }

    console.log('\n✅ All login steps completed successfully!');
    console.log('   Login should work in the browser.');

  } catch (err: any) {
    console.error('\n❌ Unexpected error:', err?.message || err);
    process.exit(1);
  }
}

testLogin();
