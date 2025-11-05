import { useState } from 'react';
import { Briefcase, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleTagsProps {
  tags: string[];
  icon?: React.ComponentType<{ className?: string }>;
  initialVisibleCount?: number;
}

export default function CollapsibleTags({
  tags,
  icon: Icon = Briefcase,
  initialVisibleCount = 10,
}: CollapsibleTagsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tags.length === 0) return null;

  const shouldShowToggle = tags.length > initialVisibleCount;
  const visibleTags = isExpanded ? tags : tags.slice(0, initialVisibleCount);
  const hiddenCount = tags.length - initialVisibleCount;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {visibleTags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground"
          >
            <Icon className="mr-1.5 h-4 w-4" />
            {tag}
          </span>
        ))}

        {shouldShowToggle && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="mr-1.5 h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="mr-1.5 h-4 w-4" />
                Show {hiddenCount} More
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
