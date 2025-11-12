/**
 * AI Searchable List - Combines AI search with traditional list display
 */

import { useState, useMemo } from 'react';
import AISearchFilter from './AISearchFilter';
import SearchableList from './SearchableList';

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

interface AISearchableListProps {
  lobbyists: Lobbyist[];
  showIndustryBadges?: boolean;
  favoriteLobbyistIds?: string[];
  isAuthenticated?: boolean;
}

export default function AISearchableList({
  lobbyists,
  showIndustryBadges = false,
  favoriteLobbyistIds = [],
  isAuthenticated = false,
}: AISearchableListProps) {
  const [aiFilteredIds, setAiFilteredIds] = useState<string[] | null>(null);

  const handleAIFilter = (ids: string[] | null) => {
    setAiFilteredIds(ids);
  };

  // Filter lobbyists if AI search is active
  const displayedLobbyists = useMemo(() => {
    if (!aiFilteredIds) {
      return lobbyists; // Show all if no AI filter
    }

    // Filter to only show AI-recommended lobbyists, maintaining their rank order
    const idSet = new Set(aiFilteredIds);
    return lobbyists.filter((l) => idSet.has(l.id));
  }, [lobbyists, aiFilteredIds]);

  return (
    <div className="space-y-6">
      {/* AI Search Filter */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Describe what you need in plain English
          </h2>
          <p className="text-sm text-muted-foreground">
            Our AI will find the best matches for your specific situation
          </p>
        </div>
        <AISearchFilter onFilter={handleAIFilter} />
      </div>

      {/* Advanced Filters Link */}
      <div className="text-left">
        <a
          href="#advanced-filters"
          className="text-sm text-texas-blue-600 hover:text-texas-blue-700 font-medium transition-colors"
        >
          Or use advanced filters (city/expertise) →
        </a>
      </div>

      {/* Results Count */}
      {aiFilteredIds && (
        <div className="text-sm text-muted-foreground">
          Showing {displayedLobbyists.length} AI-recommended {displayedLobbyists.length === 1 ? 'result' : 'results'}
        </div>
      )}

      {/* Lobbyist List */}
      <SearchableList
        lobbyists={displayedLobbyists}
        hideSearch={true} // Always hide - AI search is primary
        showIndustryBadges={showIndustryBadges}
        favoriteLobbyistIds={favoriteLobbyistIds}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
