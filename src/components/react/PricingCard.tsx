import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface PricingCardProps {
  tier: 'premium' | 'featured';
  name: string;
  price: number;
  features: string[];
  userId?: string;
  userEmail?: string;
  highlighted?: boolean;
}

export function PricingCard({
  tier,
  name,
  price,
  features,
  userId,
  userEmail,
  highlighted = false,
}: PricingCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    // Check if user is logged in
    if (!userId || !userEmail) {
      window.location.href = '/login?redirect=/pricing';
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          userId,
          email: userEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative flex flex-col rounded-lg border p-8 shadow-sm transition-all hover:shadow-md ${
        highlighted
          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600'
          : 'border-gray-200 bg-white'
      }`}
    >
      {highlighted && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-4 py-1 text-sm font-medium text-white">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="mb-2 text-2xl font-bold text-gray-900">{name}</h3>
        <div className="flex items-baseline">
          <span className="text-5xl font-bold text-gray-900">${price}</span>
          <span className="ml-2 text-gray-500">/month</span>
        </div>
      </div>

      <ul className="mb-8 flex-1 space-y-3">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <svg
              className="mr-3 h-5 w-5 flex-shrink-0 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Button
        onClick={handleSubscribe}
        disabled={loading}
        className={`w-full ${
          highlighted
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-900 hover:bg-gray-800'
        }`}
      >
        {loading ? 'Processing...' : 'Get Started'}
      </Button>

      <p className="mt-4 text-center text-xs text-gray-500">
        Cancel anytime. No long-term contracts.
      </p>
    </div>
  );
}
