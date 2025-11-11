import { useState, useRef, useEffect } from 'react';

interface SubjectArea {
  id: string;
  name: string;
  slug: string;
}

interface ClientsFilterProps {
  subjectAreas: SubjectArea[];
  initialSubjects?: string[];
  initialSort?: string;
}

export default function ClientsFilter({
  subjectAreas,
  initialSubjects = [],
  initialSort = 'lobbyist_count_desc',
}: ClientsFilterProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialSubjects);
  const [sortBy, setSortBy] = useState(initialSort);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if there's more content to scroll
  const checkScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isScrollable = container.scrollHeight > container.clientHeight;
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10;

    setShowScrollIndicator(isScrollable && !isAtBottom);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      return () => container.removeEventListener('scroll', checkScroll);
    }
  }, [subjectAreas]);

  // Handle subject filter change
  const handleSubjectChange = (subjectSlug: string) => {
    const newSubjects = selectedSubjects.includes(subjectSlug)
      ? selectedSubjects.filter(s => s !== subjectSlug)
      : [...selectedSubjects, subjectSlug];

    setSelectedSubjects(newSubjects);
    applyFilters(newSubjects, sortBy);
  };

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    applyFilters(selectedSubjects, newSort);
  };

  // Apply filters by updating URL
  const applyFilters = (subjects: string[], sort: string) => {
    const params = new URLSearchParams();

    // Add subject filters
    if (subjects.length > 0) {
      params.set('subject', subjects.join(','));
    }

    // Add sort parameter if not default
    if (sort !== 'lobbyist_count_desc') {
      params.set('sort', sort);
    }

    // Navigate with new parameters
    const newUrl = `/clients${params.toString() ? '?' + params.toString() : ''}`;
    window.location.href = newUrl;
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedSubjects([]);
    setSortBy('lobbyist_count_desc');
    window.location.href = '/clients';
  };

  return (
    <div className="space-y-4">
      {/* Sort Dropdown */}
      <div>
        <label htmlFor="sort" className="block text-sm font-medium mb-2">
          Sort by
        </label>
        <select
          id="sort"
          value={sortBy}
          onChange={(e) => handleSortChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="lobbyist_count_desc">Most Lobbyists</option>
          <option value="lobbyist_count_asc">Fewest Lobbyists</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
        </select>
      </div>

      {/* Subject Area Filter */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Filter by Subject Area
        </label>
        <div className="relative">
          <div
            ref={scrollContainerRef}
            className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3"
          >
            {subjectAreas.map((subject) => (
              <label
                key={subject.id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedSubjects.includes(subject.slug)}
                  onChange={() => handleSubjectChange(subject.slug)}
                  className="rounded border-gray-300 text-texas-blue-500 focus:ring-texas-blue-500"
                />
                <span className="text-sm">{subject.name}</span>
              </label>
            ))}
          </div>
          {/* Scroll indicator gradient - only show when there's more content below */}
          {showScrollIndicator && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-md" />
          )}
        </div>
      </div>

      {/* Clear Filters Button */}
      {(selectedSubjects.length > 0 || sortBy !== 'lobbyist_count_desc') && (
        <button
          onClick={clearFilters}
          className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
