import { Button } from '@/components/ui/button';

interface SubscriptionCardProps {
  tier: 'free' | 'premium' | 'featured';
  subscriptionStartedAt?: string | null;
  subscriptionEndsAt?: string | null;
}

const tierInfo = {
  free: {
    name: 'Free',
    color: 'bg-muted text-muted-foreground',
    features: ['Basic listing', 'Standard search placement', 'Public profile'],
  },
  premium: {
    name: 'Premium',
    color: 'bg-texas-gold-500 text-white',
    price: '$297/month',
    features: ['Priority placement', 'Analytics dashboard', 'Featured in searches', 'Remove competitors'],
  },
  featured: {
    name: 'Featured',
    color: 'bg-texas-blue-500 text-white',
    price: '$597/month',
    features: ['Top placement', 'Premium analytics', 'Featured badge', 'Priority support', 'Exclusive placement'],
  },
};

export default function SubscriptionCard({
  tier,
  subscriptionStartedAt,
  subscriptionEndsAt,
}: SubscriptionCardProps) {
  const info = tierInfo[tier];

  return (
    <div className="rounded-lg border border-border bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Subscription</h3>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${info.color}`}>
          {info.name}
        </span>
      </div>

      {tier !== 'free' && subscriptionStartedAt && (
        <div className="text-sm text-muted-foreground mb-4 space-y-1">
          <div>
            <span className="font-medium">Started:</span>{' '}
            {new Date(subscriptionStartedAt).toLocaleDateString()}
          </div>
          {subscriptionEndsAt && (
            <div>
              <span className="font-medium">Renews:</span>{' '}
              {new Date(subscriptionEndsAt).toLocaleDateString()}
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <p className="text-sm font-medium mb-2">Features included:</p>
        <ul className="space-y-2">
          {info.features.map((feature, idx) => (
            <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
              <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {tier === 'free' ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-texas-gold-50 border border-texas-gold-200 p-4">
            <p className="text-sm font-medium text-texas-gold-900 mb-1">Upgrade to Premium</p>
            <p className="text-sm text-texas-gold-700 mb-3">{tierInfo.premium.price}</p>
            <Button className="w-full bg-texas-gold-500 hover:bg-texas-gold-600 text-white">
              <a href="/upgrade?tier=premium" className="flex items-center justify-center w-full">
                Upgrade Now
              </a>
            </Button>
          </div>

          <div className="rounded-lg bg-texas-blue-50 border border-texas-blue-200 p-4">
            <p className="text-sm font-medium text-texas-blue-900 mb-1">Or go Featured</p>
            <p className="text-sm text-texas-blue-700 mb-3">{tierInfo.featured.price}</p>
            <Button variant="outline" className="w-full border-texas-blue-300 text-texas-blue-700 hover:bg-texas-blue-50">
              <a href="/upgrade?tier=featured" className="flex items-center justify-center w-full">
                Go Featured
              </a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button variant="outline" className="w-full">
            <a href="/billing" className="flex items-center justify-center w-full">
              Manage Billing
            </a>
          </Button>
          {tier === 'premium' && (
            <Button variant="outline" className="w-full text-texas-blue-600 border-texas-blue-300 hover:bg-texas-blue-50">
              <a href="/upgrade?tier=featured" className="flex items-center justify-center w-full">
                Upgrade to Featured
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
