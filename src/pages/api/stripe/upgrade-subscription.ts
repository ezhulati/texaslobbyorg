import type { APIRoute } from 'astro';
import { getStripeClient, SUBSCRIPTION_TIERS } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth-helpers';
import { createServerClient } from '@/lib/supabase';
import { sendEmail, subscriptionConfirmationEmail } from '@/lib/email';

/**
 * Upgrade an existing subscription to a higher tier
 * This modifies the current subscription instead of creating a new one
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Get current user
    const user = await getCurrentUser(cookies);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { newTier } = await request.json();

    if (!newTier || (newTier !== 'premium' && newTier !== 'featured')) {
      return new Response(
        JSON.stringify({ error: 'Invalid tier specified' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Get user's current subscription
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id, subscription_tier, email, full_name')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!userData.stripe_subscription_id) {
      return new Response(
        JSON.stringify({ error: 'No active subscription found. Please subscribe first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Can't downgrade with this endpoint
    if (userData.subscription_tier === 'featured' && newTier === 'premium') {
      return new Response(
        JSON.stringify({ error: 'Please use the Customer Portal to downgrade your subscription' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Already on this tier
    if (userData.subscription_tier === newTier) {
      return new Response(
        JSON.stringify({ error: `You are already on the ${newTier} plan` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = getStripeClient();
    const tierData = SUBSCRIPTION_TIERS[newTier];

    // Get the current subscription
    const subscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id);

    console.log(`[Upgrade] Attempting to upgrade from ${userData.subscription_tier} to ${newTier}`);
    console.log(`[Upgrade] Current price: ${subscription.items.data[0].price.id}`);
    console.log(`[Upgrade] Target price: ${tierData.priceId}`);

    // Update the subscription to the new price
    const updatedSubscription = await stripe.subscriptions.update(userData.stripe_subscription_id, {
      items: [{
        id: subscription.items.data[0].id,
        price: tierData.priceId,
      }],
      metadata: {
        ...subscription.metadata,
        tier: newTier,
      },
      proration_behavior: 'create_prorations', // Charge difference immediately
    });

    console.log(`[Upgrade] Stripe update response - price: ${updatedSubscription.items.data[0].price.id}, metadata: ${updatedSubscription.metadata.tier}`);

    // CRITICAL: Verify the price was actually updated
    const verifySubscription = await stripe.subscriptions.retrieve(userData.stripe_subscription_id);
    const actualPriceId = verifySubscription.items.data[0].price.id;
    const actualTier = verifySubscription.metadata.tier;

    console.log(`[Upgrade] Verification - actual price: ${actualPriceId}, actual tier: ${actualTier}`);

    // Check if price matches what we requested
    if (actualPriceId !== tierData.priceId) {
      // CRITICAL BUG: Stripe updated metadata but NOT the price
      console.error(`[Upgrade] CRITICAL: Price mismatch! Requested ${tierData.priceId} but got ${actualPriceId}`);
      console.error(`[Upgrade] Rolling back metadata to match actual price...`);

      // Rollback metadata to match the actual subscription tier
      const actualTierFromPrice = actualPriceId === SUBSCRIPTION_TIERS.premium.priceId ? 'premium' : 'featured';

      await stripe.subscriptions.update(userData.stripe_subscription_id, {
        metadata: {
          ...verifySubscription.metadata,
          tier: actualTierFromPrice,
        },
      });

      return new Response(
        JSON.stringify({
          error: `Failed to update subscription price. Your subscription remains on ${actualTierFromPrice}. Please contact support if this persists.`,
          details: 'Price update was not applied by Stripe'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update database ONLY if Stripe update was verified successful
    const { error: updateError } = await supabase
      .from('users')
      .update({
        subscription_tier: newTier,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user tier:', updateError);
    }

    // Update lobbyist profile
    const { error: lobbyistError } = await supabase
      .from('lobbyists')
      .update({
        subscription_tier: newTier,
      })
      .eq('user_id', user.id);

    if (lobbyistError) {
      console.error('Error updating lobbyist tier:', lobbyistError);
    }

    // Send upgrade confirmation email
    const emailTemplate = subscriptionConfirmationEmail(
      userData.full_name || 'there',
      newTier,
      tierData.price
    );
    await sendEmail({
      to: userData.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    console.log(`Successfully upgraded user ${user.id} to ${newTier}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully upgraded to ${newTier}`,
        subscription: updatedSubscription,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error upgrading subscription:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to upgrade subscription',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
