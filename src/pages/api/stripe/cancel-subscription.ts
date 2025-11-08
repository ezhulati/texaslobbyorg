import type { APIRoute } from 'astro';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth-helpers';
import { createServerClient } from '@/lib/supabase';

/**
 * Cancel a user's subscription
 * This will cancel at the end of the current billing period
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Get current user
    const user = await getCurrentUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServerClient();

    // Get user's subscription ID from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id, subscription_tier')
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
        JSON.stringify({ error: 'No active subscription found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (userData.subscription_tier === 'free') {
      return new Response(
        JSON.stringify({ error: 'Already on free tier' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cancel subscription at period end (don't cancel immediately)
    const subscription = await stripe.subscriptions.update(
      userData.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    console.log(`Subscription ${subscription.id} set to cancel at period end for user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription will be cancelled at the end of the current billing period',
        cancelAt: subscription.cancel_at,
        currentPeriodEnd: subscription.current_period_end,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error cancelling subscription:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
