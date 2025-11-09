import type { APIRoute } from 'astro';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth-helpers';
import { createServerClient } from '@/lib/supabase';

/**
 * Create a Stripe Customer Portal session
 * This allows users to manage their subscription and payment methods
 */
export const POST: APIRoute = async ({ request, url, cookies }) => {
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

    // Get user's Stripe customer ID from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!userData.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: 'No Stripe customer found. Please subscribe first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the base URL for redirects
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || url.origin;

    // Create Customer Portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${baseUrl}/dashboard/subscription`,
    });

    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating portal session:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create portal session',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
