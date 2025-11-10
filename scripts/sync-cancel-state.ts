import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function syncCancelState() {
  try {
    const userId = '95340197-a8df-4827-969e-8f1d5a957415';

    console.log('🔄 Syncing cancel_at_period_end from Stripe to database...\n');

    // Get user's subscription ID
    const { data: userData, error } = await supabase
      .from('users')
      .select('stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (error || !userData?.stripe_subscription_id) {
      console.log('❌ No subscription found for user');
      return;
    }

    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id);

    console.log('📊 Stripe Subscription State:');
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Cancel at Period End: ${subscription.cancel_at_period_end}`);
    console.log(`   Current Period End: ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}\n`);

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        cancel_at_period_end: subscription.cancel_at_period_end
      })
      .eq('id', userId);

    if (updateError) throw updateError;

    console.log('✅ Successfully synced cancel_at_period_end to database!');

    if (subscription.cancel_at_period_end) {
      console.log('\n💡 Your subscription is set to cancel at period end.');
      console.log('   Visit /dashboard/subscription to see the cancellation warning and reactivation option.');
    } else {
      console.log('\n✓ Your subscription is active and not set to cancel.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

syncCancelState();
