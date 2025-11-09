import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

async function checkUserState() {
  try {
    const userId = '95340197-a8df-4827-969e-8f1d5a957415';

    console.log('🔍 Checking user state...\n');

    // Get user data from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('subscription_tier, subscription_status, stripe_subscription_id, subscription_current_period_end')
      .eq('id', userId)
      .single();

    if (error) throw error;

    console.log('📊 Database State:');
    console.log(`   Tier: ${userData.subscription_tier}`);
    console.log(`   Status: ${userData.subscription_status || 'null'}`);
    console.log(`   Period End: ${userData.subscription_current_period_end || 'null'}\n`);

    // Get subscription from Stripe if it exists
    if (userData.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id);
        const priceId = subscription.items.data[0]?.price?.id;

        console.log('💳 Stripe State:');
        console.log(`   Subscription ID: ${subscription.id}`);
        console.log(`   Status: ${subscription.status}`);
        console.log(`   Price ID: ${priceId}`);
        console.log(`   Cancel at Period End: ${subscription.cancel_at_period_end}`);
        console.log(`   Current Period End: ${new Date(subscription.current_period_end * 1000).toLocaleString()}\n`);
      } catch (stripeError: any) {
        if (stripeError.code === 'resource_missing') {
          console.log('💳 Stripe State: Subscription no longer exists (was deleted)\n');
        } else {
          throw stripeError;
        }
      }
    } else {
      console.log('💳 Stripe State: No subscription ID in database\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserState();
