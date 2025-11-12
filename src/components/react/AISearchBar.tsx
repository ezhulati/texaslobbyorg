/**
 * AI-Powered Search Bar Component
 * Allows users to search for lobbyists using natural language
 */

import { useState } from 'react';
import { Sparkles, Search, Loader2, AlertCircle } from 'lucide-react';

interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  slug: string;
  bio: string | null;
  profile_image_url: string | null;
  cities: string[] | null;
  subject_areas: string[] | null;
  subscription_tier: 'free' | 'premium' | 'featured';
  ai_explanation: string;
}

interface SearchResponse {
  results: SearchResult[];
  extracted_criteria: {
    cities: string[];
    subject_areas: string[];
    keywords: string;
  };
  total_matches?: number;
  message?: string;
}

const EXAMPLE_QUERIES = [
  'healthcare lobbyist in Houston for hospital regulations',
  'small business advocate in Austin who knows tax policy',
  'education reform specialist in Dallas',
  'energy lobbyist with oil and gas experience',
];

export default function AISearchBar() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [extractedCriteria, setExtractedCriteria] = useState<SearchResponse['extracted_criteria'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data: SearchResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Search failed');
      }

      setResults(data.results);
      setExtractedCriteria(data.extracted_criteria);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
  };

  return (
    <div className="w-full">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you need... (e.g., 'healthcare lobbyist in Houston')"
            className="w-full pl-12 pr-32 py-4 text-base rounded-lg border-2 border-border focus:border-texas-blue-500 focus:outline-none transition-colors"
            disabled={loading}
          />
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 px-5 py-2.5 bg-texas-blue-500 text-white rounded-md hover:bg-texas-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">AI Search</span>
              </>
            )}
          </button>
        </div>

        {/* Example Queries */}
        {!hasSearched && (
          <div className="mt-3">
            <p className="text-xs text-muted-foreground mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_QUERIES.map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExampleClick(example)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-texas-blue-500 hover:bg-texas-blue-50 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Extracted Criteria Display */}
      {extractedCriteria && !error && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">AI understood your search:</p>
              <div className="text-blue-700 space-y-1">
                {extractedCriteria.cities.length > 0 && (
                  <p>• Cities: {extractedCriteria.cities.join(', ')}</p>
                )}
                {extractedCriteria.subject_areas.length > 0 && (
                  <p>• Expertise: {extractedCriteria.subject_areas.join(', ')}</p>
                )}
                {extractedCriteria.keywords && (
                  <p>• Keywords: {extractedCriteria.keywords}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">Search Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !error && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Found {results.length} {results.length === 1 ? 'Match' : 'Matches'}
            </h3>
            <a
              href={`/lobbyists?${new URLSearchParams({
                ...(extractedCriteria?.cities.length ? { city: extractedCriteria.cities[0] } : {}),
                ...(extractedCriteria?.subject_areas.length ? { subject: extractedCriteria.subject_areas[0] } : {}),
              }).toString()}`}
              className="text-sm text-texas-blue-600 hover:underline"
            >
              View all results →
            </a>
          </div>

          {results.map((result) => (
            <a
              key={result.id}
              href={`/lobbyists/${result.slug}`}
              className="block p-6 border border-border rounded-lg hover:border-texas-blue-500 hover:shadow-lg transition-all bg-white"
            >
              <div className="flex items-start gap-4">
                {/* Profile Image */}
                {result.profile_image_url ? (
                  <img
                    src={result.profile_image_url}
                    alt={`${result.first_name} ${result.last_name}`}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-texas-blue-100 flex items-center justify-center text-texas-blue-600 font-semibold text-lg flex-shrink-0">
                    {result.first_name[0]}
                    {result.last_name[0]}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h4 className="text-xl font-bold">
                      {result.first_name} {result.last_name}
                    </h4>
                    {result.subscription_tier !== 'free' && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          result.subscription_tier === 'featured'
                            ? 'bg-texas-blue-500 text-white'
                            : 'bg-texas-gold-500 text-white'
                        }`}
                      >
                        {result.subscription_tier === 'featured' ? 'Featured' : 'Premium'}
                      </span>
                    )}
                  </div>

                  {/* Cities and Expertise */}
                  {(result.cities || result.subject_areas) && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {result.cities?.slice(0, 3).join(', ')}
                      {result.cities && result.subject_areas && ' • '}
                      {result.subject_areas?.slice(0, 3).join(', ')}
                    </p>
                  )}

                  {/* AI Explanation */}
                  <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md">
                    <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-900">
                      <strong className="font-medium">Why this match:</strong>{' '}
                      {result.ai_explanation}
                    </p>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* No Results */}
      {hasSearched && !loading && results.length === 0 && !error && (
        <div className="mt-6 p-8 text-center border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground mb-4">
            No lobbyists found matching your criteria. Try broadening your search or using different keywords.
          </p>
          <a
            href="/lobbyists"
            className="inline-flex items-center justify-center rounded-md bg-texas-blue-500 px-6 py-3 text-base font-medium text-white hover:bg-texas-blue-600 transition-colors"
          >
            Browse All Lobbyists
          </a>
        </div>
      )}
    </div>
  );
}
