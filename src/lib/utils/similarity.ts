import { getAllIndustries } from '../industries-data';
import type { Database } from '../database.types';

type Lobbyist = Database['public']['Tables']['lobbyists']['Row'] & {
  clients?: Array<{
    name: string;
    description?: string | null;
  }>;
};

export interface SimilarLobbyist extends Lobbyist {
  similarityScore: number;
  matchingCities: string[];
  matchingSubjects: string[];
  sharedIndustries: string[];
}

/**
 * Check if a client name matches any industry keywords
 */
function matchesIndustryKeywords(clientName: string, keywords: string[]): boolean {
  const normalizedName = clientName.toLowerCase();
  return keywords.some((keyword) => normalizedName.includes(keyword.toLowerCase()));
}

/**
 * Get industries that a lobbyist's clients belong to
 */
function getLobbyistIndustries(clients: Lobbyist['clients']): Set<string> {
  if (!clients || clients.length === 0) return new Set();

  const industries = getAllIndustries();
  const matchedIndustries = new Set<string>();

  for (const client of clients) {
    for (const industry of industries) {
      if (matchesIndustryKeywords(client.name, industry.clientKeywords)) {
        matchedIndustries.add(industry.name);
      }
    }
  }

  return matchedIndustries;
}

/**
 * Calculate similarity score between two lobbyists
 */
function calculateSimilarity(
  currentLobbyist: Lobbyist,
  candidate: Lobbyist
): {
  score: number;
  matchingCities: string[];
  matchingSubjects: string[];
  sharedIndustries: string[];
} {
  let score = 0;

  // 1. Shared Cities (5 points each)
  const matchingCities = (candidate.cities || []).filter((city) =>
    (currentLobbyist.cities || []).includes(city)
  );
  score += matchingCities.length * 5;

  // 2. Shared Subject Areas (4 points each)
  const matchingSubjects = (candidate.subject_areas || []).filter((subject) =>
    (currentLobbyist.subject_areas || []).includes(subject)
  );
  score += matchingSubjects.length * 4;

  // 3. Shared Client Industries (10 points each)
  const currentIndustries = getLobbyistIndustries(currentLobbyist.clients);
  const candidateIndustries = getLobbyistIndustries(candidate.clients);
  const sharedIndustries = Array.from(currentIndustries).filter((industry) =>
    candidateIndustries.has(industry)
  );
  score += sharedIndustries.length * 10;

  // 4. Same Subscription Tier (3 points)
  if (candidate.subscription_tier === currentLobbyist.subscription_tier) {
    score += 3;
  }

  // 5. Similar Years of Experience (2 points if within ±5 years)
  if (
    currentLobbyist.years_experience &&
    candidate.years_experience &&
    Math.abs(currentLobbyist.years_experience - candidate.years_experience) <= 5
  ) {
    score += 2;
  }

  // 6. Bonus: City + Subject Combo (additional 3 points)
  if (matchingCities.length > 0 && matchingSubjects.length > 0) {
    score += 3;
  }

  // 7. Boost: Premium/Featured profiles (+2 points)
  if (candidate.subscription_tier === 'featured' || candidate.subscription_tier === 'premium') {
    score += 2;
  }

  // 8. View count similarity (1-2 points, normalized)
  if (currentLobbyist.view_count && candidate.view_count) {
    const maxViews = Math.max(currentLobbyist.view_count, candidate.view_count);
    if (maxViews > 0) {
      const similarity = 1 - Math.abs(currentLobbyist.view_count - candidate.view_count) / maxViews;
      score += similarity * 2;
    }
  }

  return {
    score,
    matchingCities,
    matchingSubjects,
    sharedIndustries,
  };
}

/**
 * Find similar lobbyists based on shared attributes
 *
 * @param currentLobbyist - The current lobbyist profile being viewed
 * @param candidates - Array of potential similar lobbyists
 * @param limit - Maximum number of recommendations to return (default: 6)
 * @returns Array of similar lobbyists sorted by similarity score
 */
export function calculateSimilarLobbyists(
  currentLobbyist: Lobbyist,
  candidates: Lobbyist[],
  limit: number = 6
): SimilarLobbyist[] {
  const scoredCandidates = candidates
    .filter((candidate) => candidate.id !== currentLobbyist.id) // Exclude self
    .map((candidate) => {
      const { score, matchingCities, matchingSubjects, sharedIndustries } = calculateSimilarity(
        currentLobbyist,
        candidate
      );

      return {
        ...candidate,
        similarityScore: score,
        matchingCities,
        matchingSubjects,
        sharedIndustries,
      };
    })
    .filter((candidate) => candidate.similarityScore > 0) // Only include if there's some similarity
    .sort((a, b) => {
      // Primary sort: similarity score (descending)
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }

      // Secondary sort: subscription tier (featured > premium > free)
      const tierOrder = { featured: 3, premium: 2, free: 1 };
      const aTier = tierOrder[a.subscription_tier] || 0;
      const bTier = tierOrder[b.subscription_tier] || 0;
      if (bTier !== aTier) {
        return bTier - aTier;
      }

      // Tertiary sort: view count (descending)
      return (b.view_count || 0) - (a.view_count || 0);
    });

  return scoredCandidates.slice(0, limit);
}

/**
 * Get a human-readable explanation for why a lobbyist is recommended
 */
export function getSimilarityExplanation(similar: SimilarLobbyist): string {
  const reasons: string[] = [];

  if (similar.matchingCities.length > 0) {
    reasons.push(`serves ${similar.matchingCities.slice(0, 2).join(' and ')}`);
  }

  if (similar.matchingSubjects.length > 0) {
    reasons.push(`specializes in ${similar.matchingSubjects.slice(0, 2).join(' and ')}`);
  }

  if (similar.sharedIndustries.length > 0) {
    reasons.push(`represents clients in ${similar.sharedIndustries.slice(0, 2).join(' and ')}`);
  }

  if (reasons.length === 0) {
    return 'Similar profile';
  }

  return reasons.join(', ');
}
