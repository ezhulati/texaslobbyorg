import { useState } from 'react';

interface ExpandableSubjectAreasProps {
  subjects: string[];
  initialDisplayCount?: number;
  showLabel?: boolean;
  labelText?: string;
}

export default function ExpandableSubjectAreas({
  subjects,
  initialDisplayCount = 5,
  showLabel = true,
  labelText = 'Policy areas covered by their lobbyists:',
}: ExpandableSubjectAreasProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const displayedSubjects = isExpanded ? subjects : subjects.slice(0, initialDisplayCount);
  const hasMore = subjects.length > initialDisplayCount;

  return (
    <div>
      {showLabel && (
        <p className="text-sm text-muted-foreground mb-2">
          {labelText}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {displayedSubjects.map((subject, index) => (
          <span
            key={`${subject}-${index}`}
            className="inline-flex items-center rounded-full bg-texas-blue-500/10 px-3 py-1 text-sm"
          >
            {subject}
          </span>
        ))}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer"
            aria-label={isExpanded ? 'Show fewer areas' : `Show ${subjects.length - initialDisplayCount} more areas`}
          >
            {isExpanded ? (
              <>
                <span>Show less</span>
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                <span>+{subjects.length - initialDisplayCount} more areas</span>
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
