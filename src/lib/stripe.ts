import Stripe from 'stripe';

/**
 * Server-side Stripe client (lazy initialization)
 * Only use this in API routes and server-side code
 */
let _stripe: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!import.meta.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
  }

  if (!_stripe) {
    _stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    });
  }

  return _stripe;
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use getStripeClient() instead
 */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripeClient() as any)[prop];
  }
});

/**
 * Subscription tier price IDs from environment
 */
export const PRICE_IDS = {
  PREMIUM: import.meta.env.STRIPE_PREMIUM_PRICE_ID,
  FEATURED: import.meta.env.STRIPE_FEATURED_PRICE_ID,
} as const;

/**
 * Subscription tier metadata for display
 */
export const SUBSCRIPTION_TIERS = {
  premium: {
    name: 'Premium Listing',
    price: 297,
    priceId: PRICE_IDS.PREMIUM,
    features: [
      'Enhanced visibility in search results',
      'Priority placement in listings',
      'Detailed analytics dashboard',
      'Profile badge',
      'Up to 10 client testimonials',
    ],
  },
  featured: {
    name: 'Featured Listing',
    price: 597,
    priceId: PRICE_IDS.FEATURED,
    features: [
      'Maximum visibility - top search results',
      'Homepage featured placement',
      'Featured badge with icon',
      'Comprehensive analytics dashboard',
      'Unlimited client testimonials',
      'Priority customer support',
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
