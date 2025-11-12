/**
 * AI Search Filter - Compact version for filtering existing lobbyist lists
 */

import { useState } from 'react';
import { Sparkles, Search, Loader2, X } from 'lucide-react';

interface AISearchFilterProps {
  onFilter: (lobbyistIds: string[] | null) => void;
}

export default function AISearchFilter({ onFilter }: AISearchFilterProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setIsActive(true);

    try {
      const response = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Search failed');
      }

      // Extract lobbyist IDs from results
      const ids = data.results.map((r: any) => r.id);
      onFilter(ids);

      // Scroll to top of page to show results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      onFilter(null);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsActive(false);
    setError(null);
    onFilter(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you need... (e.g., 'healthcare lobbyist in Houston')"
          className="w-full pl-12 pr-32 py-3 text-base rounded-lg border-2 border-border focus:border-texas-blue-500 focus:outline-none transition-colors"
          disabled={loading}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isActive && (
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-texas-blue-600 transition-colors"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          )}
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-texas-blue-500 text-white rounded-md hover:bg-texas-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Searching...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {isActive && !loading && !error && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
          <Sparkles className="inline h-4 w-4 mr-1" />
          AI search active - showing best matches for "{query}"
        </div>
      )}
    </div>
  );
}
