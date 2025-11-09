import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStatus() {
  try {
    const userId = '95340197-a8df-4827-969e-8f1d5a957415';

    // Check database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_tier, stripe_subscription_id')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    console.log('📊 DATABASE STATUS:');
    console.log(`   Tier: ${userData.subscription_tier}`);
    console.log(`   Subscription ID: ${userData.stripe_subscription_id}`);

    // Check Stripe
    if (userData.stripe_subscription_id) {
      const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id);
      const priceId = subscription.items.data[0].price.id;
      const amount = subscription.items.data[0].price.unit_amount! / 100;

      console.log('\n💳 STRIPE STATUS:');
      console.log(`   Price ID: ${priceId}`);
      console.log(`   Amount: $${amount}/month`);
      console.log(`   Status: ${subscription.status}`);
      console.log(`   Metadata tier: ${subscription.metadata?.tier || 'not set'}`);

      // Determine tier from price
      let actualTier = 'unknown';
      if (priceId === 'price_1SR0r3GXXTOE0eqNnEqcEaJ') {
        actualTier = 'premium';
      } else if (priceId === 'price_1SR0rEGXxVTOE0eqOovqHFsp') {
        actualTier = 'featured';
      }

      console.log(`   Actual tier from price: ${actualTier}`);

      if (actualTier !== userData.subscription_tier) {
        console.log('\n⚠️  MISMATCH DETECTED!');
        console.log(`   Database says: ${userData.subscription_tier}`);
        console.log(`   Stripe says: ${actualTier}`);
      } else {
        console.log('\n✅ Database and Stripe are in sync');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkStatus();
