import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function upgradeToFeatured() {
  try {
    const subscriptionId = 'sub_1SRdPQGXxVTOE0eqveQHuqcM';
    const userId = '95340197-a8df-4827-969e-8f1d5a957415';
    const featuredPriceId = 'price_1SR0rEGXxVTOE0eqOovqHFsp';

    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update to Featured price
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: featuredPriceId,
      }],
      metadata: {
        ...subscription.metadata,
        tier: 'featured',
      },
      proration_behavior: 'create_prorations',
    });

    console.log('Stripe subscription updated to Featured');
    console.log('New price:', updated.items.data[0].price.unit_amount! / 100);

    // Update database
    const { error: userError } = await supabase
      .from('users')
      .update({
        subscription_tier: 'featured',
      })
      .eq('id', userId);

    if (userError) throw userError;
    console.log('User subscription tier updated to featured');

    // Update lobbyist profile
    const { error: lobbyistError } = await supabase
      .from('lobbyists')
      .update({
        subscription_tier: 'featured',
      })
      .eq('user_id', userId);

    if (lobbyistError) throw lobbyistError;
    console.log('Lobbyist profile updated to featured');

    console.log('\nUpgrade complete! You are now on Featured ($597/month)');
  } catch (error) {
    console.error('Error:', error);
  }
}

upgradeToFeatured();
