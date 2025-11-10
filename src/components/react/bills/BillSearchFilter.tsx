/**
 * BillSearchFilter Component
 *
 * Interactive search and filter controls for bill searching.
 * Hydrates on client-side for real-time filtering.
 */

import { useState, useEffect } from 'react';
import type { BillSearchFilters } from '@/lib/types/bills';

interface BillSearchFilterProps {
  initialFilters?: BillSearchFilters;
  subjects?: string[];
  sessions?: Array<{ session_code: string; is_active: boolean }>;
  onFilterChange?: (filters: BillSearchFilters) => void;
}

export default function BillSearchFilter({
  initialFilters = {},
  subjects = [],
  sessions = [],
  onFilterChange,
}: BillSearchFilterProps) {
  const [query, setQuery] = useState(initialFilters.query || '');
  const [chamber, setChamber] = useState(initialFilters.chamber || '');
  const [status, setStatus] = useState(initialFilters.status || '');
  const [session, setSession] = useState(initialFilters.session || '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(
    initialFilters.subjects || []
  );
  const [showFilters, setShowFilters] = useState(false);

  // Apply filters when form is submitted or filters change
  const applyFilters = () => {
    const filters: BillSearchFilters = {
      query: query || undefined,
      chamber: chamber as any || undefined,
      status: status as any || undefined,
      session: session || undefined,
      subjects: selectedSubjects.length > 0 ? selectedSubjects : undefined,
    };

    if (onFilterChange) {
      onFilterChange(filters);
    } else {
      // Build URL and navigate
      const params = new URLSearchParams();
      if (filters.query) params.set('q', filters.query);
      if (filters.chamber) params.set('chamber', filters.chamber);
      if (filters.status) params.set('status', filters.status);
      if (filters.session) params.set('session', filters.session);
      if (filters.subjects && filters.subjects.length > 0) {
        params.set('subjects', filters.subjects.join(','));
      }

      window.location.href = `/bills?${params.toString()}`;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const clearFilters = () => {
    setQuery('');
    setChamber('');
    setStatus('');
    setSession('');
    setSelectedSubjects([]);
    window.location.href = '/bills';
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const hasActiveFilters = query || chamber || status || session || selectedSubjects.length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bills by number, keyword, or author..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Filters
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {[chamber, status, session, ...selectedSubjects].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Chamber Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chamber
                </label>
                <select
                  value={chamber}
                  onChange={(e) => setChamber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="house">House</option>
                  <option value="senate">Senate</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  <option value="filed">Filed</option>
                  <option value="referred">In Committee</option>
                  <option value="committee_passed">Passed Committee</option>
                  <option value="passed_chamber">Passed Chamber</option>
                  <option value="signed">Signed</option>
                </select>
              </div>

              {/* Session Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All</option>
                  {sessions.map((s) => (
                    <option key={s.session_code} value={s.session_code}>
                      {s.session_code} {s.is_active && '(Current)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Areas */}
            {subjects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject Areas
                </label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {subjects.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        selectedSubjects.includes(subject)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
