#!/usr/bin/env node

/**
 * Check Profile Status Script
 *
 * Checks the status of a user's profile by email
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  process.exit(1);
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Please provide an email address');
  console.error('Usage: node check-profile-status.js email@example.com');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkProfileStatus() {
  console.log(`🔍 Checking profile status for: ${email}\n`);

  // Check user account
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (userError || !user) {
    console.error('❌ No user found with email:', email);
    process.exit(1);
  }

  console.log('✅ User Account Found:');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Name: ${user.full_name || 'Not set'}`);
  console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);

  // Check for lobbyist profile
  const { data: profiles, error: profileError } = await supabase
    .from('lobbyists')
    .select('*')
    .or(`user_id.eq.${user.id},email.eq.${email},claimed_by.eq.${user.id}`);

  if (profileError) {
    console.error('❌ Error checking profiles:', profileError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  No lobbyist profile found for this user');
    console.log('\nPossible reasons:');
    console.log('  - Profile was never created');
    console.log('  - Profile creation failed');
    console.log('  - Profile was deleted');
    process.exit(0);
  }

  console.log(`📋 Found ${profiles.length} lobbyist profile(s):\n`);

  profiles.forEach((profile, index) => {
    console.log(`Profile #${index + 1}:`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Name: ${profile.first_name} ${profile.last_name}`);
    console.log(`   Slug: ${profile.slug}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Created: ${new Date(profile.created_at).toLocaleString()}`);
    console.log(`\n   Status Flags:`);
    console.log(`   - is_pending: ${profile.is_pending}`);
    console.log(`   - is_active: ${profile.is_active}`);
    console.log(`   - is_claimed: ${profile.is_claimed}`);
    console.log(`   - is_verified: ${profile.is_verified || false}`);
    console.log(`   - is_rejected: ${profile.is_rejected || false}`);

    if (profile.pending_reason) {
      console.log(`\n   Pending Reason: ${profile.pending_reason}`);
    }

    if (profile.is_rejected) {
      console.log(`\n   ❌ REJECTED:`);
      console.log(`   - Reason: ${profile.rejection_reason}`);
      console.log(`   - Category: ${profile.rejection_category}`);
      console.log(`   - Count: ${profile.rejection_count}`);
      console.log(`   - Rejected at: ${new Date(profile.rejected_at).toLocaleString()}`);
    }

    console.log(`\n   Other Info:`);
    console.log(`   - user_id: ${profile.user_id || 'null'}`);
    console.log(`   - claimed_by: ${profile.claimed_by || 'null'}`);
    console.log(`   - ID verification: ${profile.id_verification_url ? 'Yes' : 'No'}`);
    console.log(`   - Subscription: ${profile.subscription_tier}`);
    console.log('');
  });

  // Show what query the admin page is using
  console.log('📊 Admin Query Check:');
  console.log('   The admin page queries for: is_pending = true\n');

  const pendingProfiles = profiles.filter(p => p.is_pending === true);
  if (pendingProfiles.length > 0) {
    console.log(`✅ ${pendingProfiles.length} profile(s) SHOULD appear in admin pending list`);
  } else {
    console.log(`⚠️  0 profiles will appear in admin pending list`);
    console.log('\nReason: No profiles have is_pending = true');

    // Suggest fix
    const activeProfiles = profiles.filter(p => p.is_active === true);
    const rejectedProfiles = profiles.filter(p => p.is_rejected === true);

    if (activeProfiles.length > 0) {
      console.log('\n💡 These profiles are already APPROVED (is_active = true)');
    }
    if (rejectedProfiles.length > 0) {
      console.log('\n💡 These profiles are REJECTED (is_rejected = true)');
    }
  }
}

checkProfileStatus().catch(console.error);
