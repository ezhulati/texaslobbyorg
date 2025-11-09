import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Price IDs from environment
const PRICE_IDS = {
  PREMIUM: process.env.STRIPE_PREMIUM_PRICE_ID!,
  FEATURED: process.env.STRIPE_FEATURED_PRICE_ID!,
};

async function manualSync() {
  try {
    const userId = '95340197-a8df-4827-969e-8f1d5a957415';
    const subscriptionId = 'sub_1SRdPQGXxVTOE0eqveQHuqcM';

    console.log('🔄 Manually syncing subscription from Stripe...\n');

    // Get subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    const amount = subscription.items.data[0].price.unit_amount! / 100;

    console.log(`📊 Stripe Status:`);
    console.log(`   Price ID: ${priceId}`);
    console.log(`   Amount: $${amount}/month`);
    console.log(`   Status: ${subscription.status}\n`);

    // Determine tier from price ID
    let tier: 'free' | 'premium' | 'featured' = 'free';
    if (priceId === PRICE_IDS.PREMIUM) {
      tier = 'premium';
    } else if (priceId === PRICE_IDS.FEATURED) {
      tier = 'featured';
    } else {
      console.error(`⚠️  Unknown price ID: ${priceId}`);
      console.error(`   Expected Premium: ${PRICE_IDS.PREMIUM}`);
      console.error(`   Expected Featured: ${PRICE_IDS.FEATURED}`);
      throw new Error('Unknown price ID');
    }

    console.log(`✅ Detected tier: ${tier}\n`);

    // Update database
    const { error: userError } = await supabase
      .from('users')
      .update({
        subscription_tier: tier,
        subscription_status: subscription.status,
        subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', userId);

    if (userError) throw userError;
    console.log(`✅ Updated user to ${tier}`);

    // Update lobbyist profile
    const { error: lobbyistError } = await supabase
      .from('lobbyists')
      .update({
        subscription_tier: tier,
      })
      .eq('user_id', userId);

    if (lobbyistError) throw lobbyistError;
    console.log(`✅ Updated lobbyist profile to ${tier}`);

    console.log(`\n🎉 Database synced successfully to ${tier.toUpperCase()}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

manualSync();
