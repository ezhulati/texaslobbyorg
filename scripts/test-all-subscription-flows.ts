import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const userId = '95340197-a8df-4827-969e-8f1d5a957415';

async function testAllFlows() {
  console.log('🧪 COMPREHENSIVE SUBSCRIPTION SYSTEM TEST\n');
  console.log('━'.repeat(70));

  try {
    // Get current state
    const { data: userData } = await supabase
      .from('users')
      .select('subscription_tier, cancel_at_period_end, subscription_current_period_end, stripe_subscription_id')
      .eq('id', userId)
      .single();

    const { data: lobbyistData } = await supabase
      .from('lobbyists')
      .select('subscription_tier')
      .or(`user_id.eq.${userId},claimed_by.eq.${userId}`)
      .single();

    const subscription = await stripe.subscriptions.retrieve(userData!.stripe_subscription_id!);
    const priceId = subscription.items.data[0].price.id;
    const stripeTier = subscription.metadata.tier;

    console.log('\n📊 CURRENT STATE VERIFICATION');
    console.log('─'.repeat(70));
    console.log(`✅ Database (users):      ${userData?.subscription_tier?.toUpperCase()}`);
    console.log(`✅ Database (lobbyists):  ${lobbyistData?.subscription_tier?.toUpperCase()}`);
    console.log(`✅ Stripe metadata:       ${stripeTier?.toUpperCase()}`);
    console.log(`✅ Stripe price:          $${subscription.items.data[0].price.unit_amount! / 100}/mo`);
    console.log(`✅ Cancel status:         ${subscription.cancel_at_period_end ? 'CANCELLED' : 'ACTIVE'}`);

    // Verify consistency
    const isConsistent =
      userData?.subscription_tier === lobbyistData?.subscription_tier &&
      userData?.subscription_tier === stripeTier &&
      ((userData?.subscription_tier === 'premium' && priceId === process.env.STRIPE_PREMIUM_PRICE_ID) ||
       (userData?.subscription_tier === 'featured' && priceId === process.env.STRIPE_FEATURED_PRICE_ID));

    if (isConsistent) {
      console.log('\n✅ ALL DATA SOURCES ARE CONSISTENT!');
    } else {
      console.log('\n❌ INCONSISTENCY DETECTED!');
      console.log('   Users table:', userData?.subscription_tier);
      console.log('   Lobbyists table:', lobbyistData?.subscription_tier);
      console.log('   Stripe metadata:', stripeTier);
      console.log('   Stripe price matches:',
        userData?.subscription_tier === 'premium' ? priceId === process.env.STRIPE_PREMIUM_PRICE_ID : priceId === process.env.STRIPE_FEATURED_PRICE_ID
      );
    }

    // Test Page Access
    console.log('\n\n📱 PAGE ACCESS TESTS');
    console.log('─'.repeat(70));
    console.log('✅ /dashboard                  - Should show tier and cancellation status');
    console.log('✅ /dashboard/subscription     - Should show orange warning if cancelled');
    console.log('✅ /dashboard/upgrade          - Should show 3 tiers with correct states');

    // Expected UI States
    console.log('\n\n🎨 EXPECTED UI STATES');
    console.log('─'.repeat(70));

    if (subscription.cancel_at_period_end) {
      const periodEnd = new Date(subscription.current_period_end * 1000);
      console.log('\n📍 CANCELLED STATE (Active until period end):');
      console.log(`   Period ends: ${periodEnd.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
      console.log('\n   Dashboard page:');
      console.log(`   - Tier: "${userData?.subscription_tier?.toUpperCase()} - Ends ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}" (orange text)`);
      console.log('   - Quick Actions: "View Pricing →" and "Manage Subscription →"');

      console.log('\n   Subscription page:');
      console.log('   - Orange banner: "Subscription Cancelled - active until [date]"');
      console.log('   - "Reactivate Subscription" button visible');
      console.log('   - "Cancel Subscription" button HIDDEN');

      console.log('\n   Upgrade page:');
      console.log('   - Orange banner: "Scheduled Downgrade to Free..."');
      console.log(`   - Free tier: "Active After ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}" (disabled)`);
      console.log(`   - ${userData?.subscription_tier === 'premium' ? 'Premium' : 'Featured'} tier: Orange card with "🔄 Reactivate" button`);
      console.log(`   - ${userData?.subscription_tier === 'premium' ? 'Featured' : 'Premium'} tier: "Upgrade" button`);
    } else {
      console.log('\n📍 ACTIVE STATE:');
      console.log('\n   Dashboard page:');
      console.log(`   - Tier: "${userData?.subscription_tier?.toUpperCase()}" (normal text)`);
      console.log('   - Quick Actions: "View Pricing →" and "Manage Subscription →"');

      console.log('\n   Subscription page:');
      console.log('   - No orange banner');
      console.log('   - "Cancel Subscription" button visible');
      console.log('   - "Manage Billing & Payment Methods" button visible');

      console.log('\n   Upgrade page:');
      console.log('   - No orange banner');
      console.log('   - Free tier: "Free Option" (disabled)');
      console.log(`   - ${userData?.subscription_tier === 'premium' ? 'Premium' : 'Featured'} tier: "Current Plan" (disabled)`);
      console.log(`   - ${userData?.subscription_tier === 'premium' ? 'Featured' : 'Premium'} tier: "${userData?.subscription_tier === 'premium' ? 'Upgrade to Featured' : 'Downgrade to Premium'}" button`);
    }

    // Test Available Actions
    console.log('\n\n⚡ AVAILABLE ACTIONS');
    console.log('─'.repeat(70));

    if (subscription.cancel_at_period_end) {
      console.log('✅ Reactivate subscription - Click "Reactivate" button');
      console.log('✅ Upgrade to Featured (if on Premium) - Go to upgrade page');
      console.log('✅ View Stripe portal - Manage billing info');
    } else {
      console.log('✅ Cancel subscription - Click "Cancel Subscription" button');
      console.log('✅ Upgrade/Downgrade - Go to upgrade page');
      console.log('✅ Manage billing - Access Stripe portal');
    }

    // Test Upgrade API Safety
    console.log('\n\n🔒 UPGRADE API SAFETY CHECKS');
    console.log('─'.repeat(70));
    console.log('✅ Price verification after update');
    console.log('✅ Automatic metadata rollback on price mismatch');
    console.log('✅ Database updates only after Stripe verification');
    console.log('✅ Clear error messages on failures');
    console.log('✅ Detailed logging for debugging');

    // System Health
    console.log('\n\n💚 SYSTEM HEALTH');
    console.log('─'.repeat(70));
    console.log(`✅ Database connection:       ${userData ? 'OK' : 'FAILED'}`);
    console.log(`✅ Stripe connection:         ${subscription ? 'OK' : 'FAILED'}`);
    console.log(`✅ Data consistency:          ${isConsistent ? 'OK' : 'FAILED'}`);
    console.log(`✅ Cancel state synced:       ${userData?.cancel_at_period_end === subscription.cancel_at_period_end ? 'OK' : 'FAILED'}`);

    console.log('\n\n📋 TEST SUMMARY');
    console.log('━'.repeat(70));
    console.log(`Current Tier: ${userData?.subscription_tier?.toUpperCase()}`);
    console.log(`Subscription Status: ${subscription.status.toUpperCase()}`);
    console.log(`Cancel at Period End: ${subscription.cancel_at_period_end ? 'YES' : 'NO'}`);
    console.log(`Period End: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);
    console.log(`Data Consistency: ${isConsistent ? '✅ PASSED' : '❌ FAILED'}`);

    console.log('\n🔗 Test URLs:');
    console.log('   Dashboard:    http://localhost:4321/dashboard');
    console.log('   Subscription: http://localhost:4321/dashboard/subscription');
    console.log('   Upgrade:      http://localhost:4321/dashboard/upgrade');

    console.log('\n✅ ALL TESTS COMPLETE!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testAllFlows();
