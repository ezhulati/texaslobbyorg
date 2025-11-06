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
  matchingSubjects?: string[];
  industryClientCount?: number;
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
  matchingSubjects,
  industryClientCount,
}: LobbyistCardProps) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();

  return (
    <a
      href={`/lobbyists/${slug}`}
      className={cn(
        'block rounded-lg border bg-white p-6 transition-all relative overflow-hidden',
        subscriptionTier === 'featured' && 'border-texas-red-500 shadow-xl ring-2 ring-texas-red-500/30 hover:shadow-2xl hover:ring-texas-red-500/40',
        subscriptionTier === 'premium' && 'border-texas-gold-500 shadow-lg ring-2 ring-texas-gold-500/20 hover:shadow-xl hover:ring-texas-gold-500/30',
        subscriptionTier === 'free' && 'border-border hover:shadow-lg'
      )}
    >
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full text-xl font-semibold relative z-10',
            subscriptionTier === 'featured' ? 'bg-gradient-to-br from-texas-red-500 to-texas-red-600 text-white ring-2 ring-texas-red-500/30' :
            subscriptionTier === 'premium' ? 'bg-gradient-to-br from-texas-gold-500 to-texas-gold-600 text-white ring-2 ring-texas-gold-500/30' :
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
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-foreground line-clamp-1">
              {fullName}
            </h3>
            {subscriptionTier !== 'free' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold shadow-sm',
                  subscriptionTier === 'featured' && 'bg-gradient-to-r from-texas-red-500 to-texas-red-600 text-white ring-2 ring-texas-red-500/30',
                  subscriptionTier === 'premium' && 'bg-gradient-to-r from-texas-gold-500 to-texas-gold-600 text-white ring-2 ring-texas-gold-500/30'
                )}
              >
                {subscriptionTier === 'featured' && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                )}
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

          {/* Industry client count - shown prominently if available */}
          {industryClientCount !== undefined && industryClientCount > 0 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-md bg-texas-gold-500/10 border border-texas-gold-500/30">
              <svg className="h-4 w-4 text-texas-gold-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
              <span className="text-xs font-semibold text-texas-gold-700">
                {industryClientCount} Industry {industryClientCount === 1 ? 'Client' : 'Clients'}
              </span>
            </div>
          )}

          {/* Subject areas */}
          {subjectAreas && subjectAreas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {/* Show matching subjects first with highlight */}
              {matchingSubjects && matchingSubjects.length > 0 && matchingSubjects.slice(0, 3).map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center rounded-md bg-texas-blue-500/10 border border-texas-blue-500/30 px-2 py-1 text-xs font-semibold text-texas-blue-700"
                >
                  <Briefcase className="mr-1 h-3 w-3" />
                  {subject}
                </span>
              ))}
              {/* Show remaining non-matching subjects */}
              {!matchingSubjects && subjectAreas.slice(0, 4).map((subject) => (
                <span
                  key={subject}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground"
                >
                  <Briefcase className="mr-1 h-3 w-3" />
                  {subject}
                </span>
              ))}
              {matchingSubjects && matchingSubjects.length > 3 && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  +{matchingSubjects.length - 3} more
                </span>
              )}
              {!matchingSubjects && subjectAreas.length > 4 && (
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  +{subjectAreas.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* View count */}
          <div className="mt-3 text-xs text-muted-foreground">
            {(viewCount || 0).toLocaleString()} {viewCount === 1 ? 'view' : 'views'}
          </div>
        </div>
      </div>
    </a>
  );
}
