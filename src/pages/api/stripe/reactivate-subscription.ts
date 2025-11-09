import type { APIRoute } from 'astro';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth-helpers';
import { createServerClient } from '@/lib/supabase';

/**
 * Reactivate a user's cancelled subscription
 * This will undo a cancellation that was set to cancel at period end
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

    const supabase = createServerClient();

    // Get user's subscription ID from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_subscription_id, subscription_tier, cancel_at_period_end')
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

    if (!userData.cancel_at_period_end) {
      return new Response(
        JSON.stringify({ error: 'Subscription is not set to cancel' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Reactivate subscription by setting cancel_at_period_end to false
    const subscription = await stripe.subscriptions.update(
      userData.stripe_subscription_id,
      {
        cancel_at_period_end: false,
      }
    );

    console.log(`Subscription ${subscription.id} reactivated for user ${user.id}`);

    // Update database to reflect reactivation (if column exists)
    try {
      await supabase
        .from('users')
        .update({
          cancel_at_period_end: false,
        })
        .eq('id', user.id);
    } catch (updateError) {
      // Ignore if column doesn't exist yet
      console.log('Note: cancel_at_period_end column not yet added to database');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscription has been reactivated',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error reactivating subscription:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to reactivate subscription',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
