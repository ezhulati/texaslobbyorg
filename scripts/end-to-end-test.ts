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

async function testEndToEnd() {
  console.log('🧪 END-TO-END SUBSCRIPTION TEST\n');
  console.log('━'.repeat(70));

  try {
    // Step 1: Check if column exists
    console.log('\n📋 STEP 1: Check Database Column');
    console.log('─'.repeat(70));

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, cancel_at_period_end, stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log('❌ Database error:', userError.message);
      return;
    }

    const hasColumn = userData && 'cancel_at_period_end' in userData;

    if (!hasColumn) {
      console.log('❌ Column "cancel_at_period_end" does NOT exist yet\n');
      console.log('📝 Please run this SQL in Supabase SQL Editor first:');
      console.log('🔗 https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/sql/new\n');
      console.log('━'.repeat(70));
      console.log(`
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_cancel_at_period_end
ON public.users(cancel_at_period_end)
WHERE cancel_at_period_end = true;

COMMENT ON COLUMN public.users.cancel_at_period_end IS 'Whether the subscription is set to cancel at the end of the current billing period';
      `.trim());
      console.log('━'.repeat(70));
      console.log('\nRun this script again after adding the column.\n');
      return;
    }

    console.log('✅ Column exists in database');
    console.log(`   Current database value: ${userData.cancel_at_period_end}`);

    // Step 2: Get Stripe subscription state
    console.log('\n📋 STEP 2: Check Stripe Subscription State');
    console.log('─'.repeat(70));

    if (!userData.stripe_subscription_id) {
      console.log('❌ No subscription ID found');
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id);

    console.log(`✅ Stripe Subscription: ${subscription.id}`);
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Cancel at Period End: ${subscription.cancel_at_period_end}`);
    console.log(`   Current Period End: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);

    // Step 3: Sync if needed
    if (subscription.cancel_at_period_end !== userData.cancel_at_period_end) {
      console.log('\n📋 STEP 3: Sync Cancel State');
      console.log('─'.repeat(70));
      console.log(`⚠️  Database and Stripe are OUT OF SYNC`);
      console.log(`   Stripe: ${subscription.cancel_at_period_end}`);
      console.log(`   Database: ${userData.cancel_at_period_end}`);
      console.log('\n🔄 Syncing...');

      const { error: syncError } = await supabase
        .from('users')
        .update({ cancel_at_period_end: subscription.cancel_at_period_end })
        .eq('id', userId);

      if (syncError) {
        console.log('❌ Sync failed:', syncError.message);
        return;
      }

      console.log('✅ Synced successfully!');
    } else {
      console.log('\n📋 STEP 3: Check Sync Status');
      console.log('─'.repeat(70));
      console.log('✅ Database and Stripe are IN SYNC');
    }

    // Step 4: Test UI expectations
    console.log('\n📋 STEP 4: UI Testing Checklist');
    console.log('─'.repeat(70));

    if (subscription.cancel_at_period_end) {
      console.log('✅ Subscription is SET TO CANCEL');
      console.log('\n📱 Expected UI on /dashboard/subscription:');
      console.log('   ⚠️  Orange warning banner should appear');
      console.log('   📝 Message: "Subscription Cancelled - Active until [date]"');
      console.log('   🔄 "Reactivate Subscription" button should be visible');
      console.log('   ❌ "Cancel Subscription" button should be HIDDEN');
      console.log('\n✉️  Email Status:');
      console.log('   📧 Cancellation email should have been sent when you cancelled');
    } else {
      console.log('✅ Subscription is ACTIVE');
      console.log('\n📱 Expected UI on /dashboard/subscription:');
      console.log('   ✓ No warning banner');
      console.log('   ✓ "Cancel Subscription" button visible');
      console.log('   ✗ "Reactivate Subscription" button hidden');
    }

    // Step 5: Test actions
    console.log('\n📋 STEP 5: Available Test Actions');
    console.log('─'.repeat(70));

    if (subscription.cancel_at_period_end) {
      console.log('🔄 Test Reactivation:');
      console.log('   1. Visit: https://texaslobby.org/dashboard/subscription');
      console.log('   2. Click "Reactivate Subscription" button');
      console.log('   3. Orange warning should disappear');
      console.log('   4. "Cancel Subscription" button should reappear');
    } else {
      console.log('❌ Test Cancellation:');
      console.log('   1. Visit: https://texaslobby.org/dashboard/subscription');
      console.log('   2. Click "Cancel Subscription" button');
      console.log('   3. Confirm cancellation');
      console.log('   4. Orange warning banner should appear');
      console.log('   5. Check email for cancellation notification');
    }

    console.log('\n📊 Test Downgrade (if on Featured):');
    console.log('   1. Visit Stripe Customer Portal');
    console.log('   2. Change from Featured to Premium');
    console.log('   3. Check email for downgrade notification');
    console.log('   4. Verify database shows Premium tier');

    // Final summary
    console.log('\n📋 FINAL SUMMARY');
    console.log('━'.repeat(70));
    console.log(`Current Tier: ${userData.subscription_tier.toUpperCase()}`);
    console.log(`Status: ${subscription.status}`);
    console.log(`Cancel at Period End: ${subscription.cancel_at_period_end ? 'YES' : 'NO'}`);
    console.log(`Period End: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}`);
    console.log('\n🔗 Test URLs:');
    console.log('   Subscription Page: https://texaslobby.org/dashboard/subscription');
    console.log('   Upgrade Page: https://texaslobby.org/dashboard/upgrade');
    console.log('   Stripe Portal: https://billing.stripe.com/p/login/test_...');
    console.log('\n✅ All systems ready for testing!\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

testEndToEnd();
