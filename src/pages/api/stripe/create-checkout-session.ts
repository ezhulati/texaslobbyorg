import type { APIRoute } from 'astro';
import { stripe, SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/lib/stripe';

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const { tier, userId, email } = body;

    // Validate tier
    if (!tier || !(tier in SUBSCRIPTION_TIERS)) {
      return new Response(
        JSON.stringify({ error: 'Invalid subscription tier' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId and email' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tierData = SUBSCRIPTION_TIERS[tier as SubscriptionTier];

    // Get the base URL for redirects
    const baseUrl = import.meta.env.PUBLIC_SITE_URL || url.origin;

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
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId,
        tier,
      },
      subscription_data: {
        metadata: {
          userId,
          tier,
        },
      },
      success_url: `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/subscription/cancel`,
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
