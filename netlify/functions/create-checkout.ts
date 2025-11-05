import type { Handler, HandlerEvent } from '@netlify/functions';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export const handler: Handler = async (event: HandlerEvent) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse form data
    const params = new URLSearchParams(event.body || '');
    const priceId = params.get('priceId');
    const lobbyistId = params.get('lobbyistId');

    if (!priceId || !lobbyistId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Map priceId to actual Stripe Price IDs
    const priceIdMap: Record<string, string> = {
      premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
      featured: process.env.STRIPE_FEATURED_PRICE_ID!,
    };

    const stripePriceId = priceIdMap[priceId];

    if (!stripePriceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid price ID' }),
      };
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.URL || 'http://localhost:4323'}/dashboard?upgrade=success`,
      cancel_url: `${process.env.URL || 'http://localhost:4323'}/upgrade?canceled=true`,
      metadata: {
        lobbyistId,
        tier: priceId,
      },
    });

    // Redirect to Checkout
    return {
      statusCode: 303,
      headers: {
        Location: session.url!,
      },
      body: '',
    };
  } catch (error: any) {
    console.error('Stripe checkout error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to create checkout session',
        message: error.message,
      }),
    };
  }
};
