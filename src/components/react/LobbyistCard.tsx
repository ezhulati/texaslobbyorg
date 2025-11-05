import { MapPin, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LobbyistCardProps {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  cities: string[];
  subjectAreas: string[];
  subscriptionTier: 'free' | 'premium' | 'featured';
  viewCount: number;
}

export default function LobbyistCard({
  firstName,
  lastName,
  slug,
  bio,
  profileImageUrl,
  cities,
  subjectAreas,
  subscriptionTier,
  viewCount,
}: LobbyistCardProps) {
  const initials = `${firstName[0]}${lastName[0]}`;
  const fullName = `${firstName} ${lastName}`;

  return (
    <a
      href={`/lobbyists/${slug}`}
      className={cn(
        'block rounded-lg border bg-white p-6 transition-all hover:shadow-lg',
        subscriptionTier === 'featured' && 'border-texas-red-500 shadow-md ring-2 ring-texas-red-500/20',
        subscriptionTier === 'premium' && 'border-texas-blue-500/30 ring-1 ring-texas-blue-500/10',
        subscriptionTier === 'free' && 'border-border'
      )}
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-semibold',
            subscriptionTier === 'featured' ? 'bg-texas-red-500 text-white' :
            subscriptionTier === 'premium' ? 'bg-texas-blue-500 text-white' :
            'bg-lone-star-200 text-lone-star-700'
          )}
        >
          {profileImageUrl ? (
            <img
              src={profileImageUrl}
              alt={fullName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground line-clamp-1">
              {fullName}
            </h3>
            {subscriptionTier !== 'free' && (
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  subscriptionTier === 'featured' && 'bg-texas-red-500 text-white',
                  subscriptionTier === 'premium' && 'bg-texas-blue-500 text-white'
                )}
              >
                {subscriptionTier === 'featured' ? 'Featured' : 'Premium'}
              </span>
            )}
          </div>

          {/* Location */}
          {cities && cities.length > 0 && (
            <div className="mt-2 flex items-center text-sm text-muted-foreground">
              <MapPin className="mr-1.5 h-4 w-4" />
              <span className="line-clamp-1">
                {cities.slice(0, 2).join(', ')}
                {cities.length > 2 && ` +${cities.length - 2}`}
              </span>
            </div>
          )}

          {/* Bio excerpt */}
          {bio && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {bio}
            </p>
          )}

          {/* Subject areas */}
          {subjectAreas && subjectAreas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subjectAreas.slice(0, 4).map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                >
                  <Briefcase className="mr-1 h-3 w-3" />
                  {subject}
                </span>
              ))}
              {subjectAreas.length > 4 && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  +{subjectAreas.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* View count */}
          <div className="mt-3 text-xs text-muted-foreground">
            {viewCount.toLocaleString()} {viewCount === 1 ? 'view' : 'views'}
          </div>
        </div>
      </div>
    </a>
  );
}
