import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import LobbyistCard from './LobbyistCard';

interface Lobbyist {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  bio?: string | null;
  profile_image_url?: string | null;
  cities: string[];
  subject_areas: string[];
  subscription_tier: 'free' | 'premium' | 'featured';
  view_count: number;
  matchingSubjects?: string[];
  industryClientCount?: number;
  relevanceScore?: number;
  is_claimed?: boolean;
  claimed_by?: string | null;
}

interface SearchableListProps {
  lobbyists: Lobbyist[];
  hideSearch?: boolean;
  showIndustryBadges?: boolean;
  favoriteLobbyistIds?: string[];
  isAuthenticated?: boolean;
}

export default function SearchableList({
  lobbyists,
  hideSearch = false,
  showIndustryBadges = false,
  favoriteLobbyistIds = [],
  isAuthenticated = false
}: SearchableListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLobbyists = useMemo(() => {
    if (!searchQuery.trim()) {
      return lobbyists;
    }

    const query = searchQuery.toLowerCase();

    return lobbyists.filter((lobbyist) => {
      // Search by name
      const fullName = `${lobbyist.first_name} ${lobbyist.last_name}`.toLowerCase();
      if (fullName.includes(query)) return true;

      // Search by cities
      if (lobbyist.cities?.some(city => city.toLowerCase().includes(query))) return true;

      // Search by subject areas
      if (lobbyist.subject_areas?.some(subject => subject.toLowerCase().includes(query))) return true;

      // Search by bio
      if (lobbyist.bio?.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [lobbyists, searchQuery]);

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 mt-8">
      {!hideSearch && (
        <>
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, city, or expertise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-12 rounded-lg border border-border bg-white text-base focus:outline-none focus:ring-2 focus:ring-texas-blue-500 focus:border-texas-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                aria-label="Clear search"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              {filteredLobbyists.length === lobbyists.length ? (
                <>Showing all {lobbyists.length} lobbyist{lobbyists.length !== 1 ? 's' : ''}</>
              ) : (
                <>
                  Showing {filteredLobbyists.length} of {lobbyists.length} lobbyist{lobbyists.length !== 1 ? 's' : ''}
                </>
              )}
            </p>
            {searchQuery && (
              <button
                onClick={handleClear}
                className="text-texas-blue-500 hover:underline font-medium"
              >
                Clear search
              </button>
            )}
          </div>
        </>
      )}

      {/* Results Grid */}
      {filteredLobbyists.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2">
          {filteredLobbyists.map((lobbyist) => (
            <LobbyistCard
              key={lobbyist.id}
              id={lobbyist.id}
              firstName={lobbyist.first_name}
              lastName={lobbyist.last_name}
              slug={lobbyist.slug}
              bio={lobbyist.bio}
              profileImageUrl={lobbyist.profile_image_url}
              cities={lobbyist.cities}
              subjectAreas={lobbyist.subject_areas}
              subscriptionTier={lobbyist.subscription_tier}
              viewCount={lobbyist.view_count}
              matchingSubjects={showIndustryBadges ? lobbyist.matchingSubjects : undefined}
              industryClientCount={showIndustryBadges ? lobbyist.industryClientCount : undefined}
              isFavorited={favoriteLobbyistIds.includes(lobbyist.id)}
              isAuthenticated={isAuthenticated}
              isClaimed={lobbyist.is_claimed}
              claimedBy={lobbyist.claimed_by}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No results found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your search terms
          </p>
          <button
            onClick={handleClear}
            className="text-texas-blue-500 hover:underline font-medium"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
