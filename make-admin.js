#!/usr/bin/env node

/**
 * Make Admin Script
 *
 * Sets a user's role to 'admin' in the database
 *
 * Usage:
 *   node make-admin.js your-email@example.com
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Make sure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Please provide an email address');
  console.error('Usage: node make-admin.js your-email@example.com');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function makeAdmin() {
  console.log(`🔍 Looking for user: ${email}`);

  // Check if user exists
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (fetchError || !user) {
    console.error('❌ User not found with email:', email);
    console.error('Error:', fetchError?.message);
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.full_name || email}`);
  console.log(`   Current role: ${user.role}`);

  if (user.role === 'admin') {
    console.log('✅ User is already an admin!');
    process.exit(0);
  }

  // Update to admin
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', user.id);

  if (updateError) {
    console.error('❌ Error updating user role:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Successfully updated user role to admin!');
  console.log(`\n🎉 ${email} is now an admin!`);
  console.log('\nYou can now access:');
  console.log('  - https://texaslobby.org/admin/pending-profiles');
  console.log('  - http://localhost:4321/admin/pending-profiles (local)');
}

makeAdmin().catch(console.error);
