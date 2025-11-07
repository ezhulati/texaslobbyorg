import { MapPin, Briefcase, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SimilarLobbyistCardProps {
  firstName: string;
  lastName: string;
  slug: string;
  bio?: string | null;
  profileImageUrl?: string | null;
  cities: string[];
  subjectAreas: string[];
  subscriptionTier: 'free' | 'premium' | 'featured';
  viewCount: number;
  title?: string | null;
}

export default function SimilarLobbyistCard({
  firstName,
  lastName,
  slug,
  bio,
  profileImageUrl,
  cities,
  subjectAreas,
  subscriptionTier,
  viewCount,
  title,
}: SimilarLobbyistCardProps) {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();

  return (
    <a
      href={`/lobbyists/${slug}`}
      className={cn(
        'group block rounded-xl border bg-white p-5 transition-all hover:shadow-lg hover:-translate-y-1',
        subscriptionTier === 'featured' && 'border-texas-red-200 bg-gradient-to-br from-white to-texas-red-50/30',
        subscriptionTier === 'premium' && 'border-texas-gold-200 bg-gradient-to-br from-white to-texas-gold-50/30',
        subscriptionTier === 'free' && 'border-gray-200'
      )}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full text-lg font-semibold transition-transform group-hover:scale-110',
              subscriptionTier === 'featured' ? 'bg-gradient-to-br from-texas-red-500 to-texas-red-600 text-white ring-2 ring-texas-red-200' :
              subscriptionTier === 'premium' ? 'bg-gradient-to-br from-texas-gold-500 to-texas-gold-600 text-white ring-2 ring-texas-gold-200' :
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
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground group-hover:text-texas-blue-600 transition-colors line-clamp-1">
                {fullName}
              </h3>
              {title && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {title}
                </p>
              )}
            </div>

            {subscriptionTier !== 'free' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
                  subscriptionTier === 'featured' && 'bg-texas-red-500 text-white',
                  subscriptionTier === 'premium' && 'bg-texas-gold-500 text-white'
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
            <div className="flex items-center text-sm text-muted-foreground mb-3">
              <MapPin className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="line-clamp-1">
                {cities.slice(0, 2).join(', ')}
                {cities.length > 2 && ` +${cities.length - 2}`}
              </span>
            </div>
          )}

          {/* Subject tags - compact horizontal display */}
          {subjectAreas && subjectAreas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {subjectAreas.slice(0, 3).map((subject, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 rounded-md bg-texas-blue-50 border border-texas-blue-200 px-2 py-0.5 text-xs font-medium text-texas-blue-700"
                >
                  <Briefcase className="h-3 w-3" />
                  {subject}
                </span>
              ))}
              {subjectAreas.length > 3 && (
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  +{subjectAreas.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Footer - Views */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            <span>{(viewCount || 0).toLocaleString()} views</span>
          </div>
        </div>
      </div>
    </a>
  );
}
