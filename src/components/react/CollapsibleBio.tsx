import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleBioProps {
  bio: string;
  previewSentences?: number;
}

export default function CollapsibleBio({
  bio,
  previewSentences = 3
}: CollapsibleBioProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Split bio into actual paragraphs (by double newlines or single newlines)
  const paragraphs = bio
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // Get first paragraph (or entire bio if only one paragraph)
  const firstParagraph = paragraphs[0] || bio;

  // Split first paragraph into sentences for preview
  const sentences = firstParagraph.match(/[^.!?]+[.!?]+/g) || [firstParagraph];

  // Determine if we need collapse functionality
  const needsCollapse = paragraphs.length > 1 || sentences.length > previewSentences;

  // Get preview text (first N sentences from first paragraph)
  const previewText = needsCollapse
    ? sentences.slice(0, previewSentences).join(' ')
    : bio;

  return (
    <div className="space-y-4">
      {isExpanded ? (
        // Show full bio with paragraphs
        <div className="space-y-4">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        // Show preview
        <p className="text-muted-foreground leading-relaxed">
          {previewText}
          {needsCollapse && <span className="text-muted-foreground/60">...</span>}
        </p>
      )}

      {needsCollapse && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-texas-blue-500 hover:text-texas-blue-600 font-medium text-sm transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Read Less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Read More
            </>
          )}
        </button>
      )}
    </div>
  );
}
