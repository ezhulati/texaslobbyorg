import type { APIRoute } from 'astro';
import { getStripeClient, SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, url, cookies }) => {
  try {
    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { tier } = body;

    // Validate tier
    if (!tier || !(tier in SUBSCRIPTION_TIERS)) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription tier' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user's email from database
    const serverClient = createServerClient();
    const { data: userData, error: userError } = await serverClient
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tierData = SUBSCRIPTION_TIERS[tier as SubscriptionTier];

    if (!tierData.priceId) {
      return new Response(
        JSON.stringify({ error: 'Subscription pricing is not configured yet. Please contact support.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the base URL for redirects
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || url.origin;

    // Get Stripe client (lazy initialization)
    const stripe = getStripeClient();

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: tierData.priceId,
          quantity: 1,
        },
      ],
      customer_email: userData.email,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        tier,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
        },
      },
      success_url: `${baseUrl}/dashboard/subscription?success=true`,
      cancel_url: `${baseUrl}/dashboard/upgrade?canceled=true`,
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to create checkout session'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
