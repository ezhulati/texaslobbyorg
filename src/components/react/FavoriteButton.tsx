import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  lobbyistId: string;
  lobbyistName: string;
  initialIsFavorited: boolean;
  isAuthenticated: boolean;
  className?: string;
  variant?: 'icon' | 'button';
  onAuthRequired?: () => void; // Callback to show auth modal
}

/**
 * FavoriteButton - Heart button to favorite/unfavorite a lobbyist
 *
 * Features:
 * - Optimistic UI updates
 * - Auth nudging for unauthenticated users
 * - Loading states and animations
 * - Two variants: icon-only or button with text
 *
 * Usage:
 * <FavoriteButton
 *   lobbyistId="uuid"
 *   lobbyistName="John Doe"
 *   initialIsFavorited={false}
 *   isAuthenticated={true}
 *   onAuthRequired={() => setShowAuthModal(true)}
 * />
 */
export default function FavoriteButton({
  lobbyistId,
  lobbyistName,
  initialIsFavorited,
  isAuthenticated,
  className,
  variant = 'icon',
  onAuthRequired
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Auth check - nudge unauthenticated users
    if (!isAuthenticated) {
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        // Fallback: redirect to signup with return URL
        const currentUrl = encodeURIComponent(window.location.pathname);
        window.location.href = `/signup?redirect=${currentUrl}`;
      }
      return;
    }

    // Optimistic update
    const previousState = isFavorited;
    setIsFavorited(!isFavorited);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyistId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update favorite');
      }

      // Update with server response (should match optimistic update)
      setIsFavorited(result.data.isFavorited);
    } catch (err) {
      // Revert optimistic update on error
      setIsFavorited(previousState);
      setError(err instanceof Error ? err.message : 'Failed to update favorite');
      console.error('[FavoriteButton] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'button') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
          'border border-border hover:bg-accent',
          isFavorited && 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
          isLoading && 'opacity-50 cursor-not-allowed',
          className
        )}
        title={isFavorited ? `Remove ${lobbyistName} from favorites` : `Add ${lobbyistName} to favorites`}
      >
        <svg
          className={cn(
            'h-5 w-5 transition-transform',
            isFavorited && 'scale-110',
            isLoading && 'animate-pulse'
          )}
          fill={isFavorited ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={isFavorited ? 0 : 2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        {isFavorited ? 'Favorited' : 'Add to Favorites'}
      </button>
    );
  }

  // Icon-only variant (default)
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'inline-flex items-center justify-center rounded-full p-2 transition-all',
        'hover:bg-accent hover:scale-110',
        isFavorited ? 'text-red-600' : 'text-muted-foreground',
        isLoading && 'opacity-50 cursor-not-allowed animate-pulse',
        className
      )}
      title={isFavorited ? `Remove ${lobbyistName} from favorites` : `Add ${lobbyistName} to favorites`}
      aria-label={isFavorited ? `Remove ${lobbyistName} from favorites` : `Add ${lobbyistName} to favorites`}
    >
      <svg
        className={cn(
          'h-6 w-6 transition-transform',
          isFavorited && 'scale-110',
          isLoading && 'animate-pulse'
        )}
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={isFavorited ? 0 : 2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>

      {error && (
        <span className="sr-only" role="alert">
          Error: {error}
        </span>
      )}
    </button>
  );
}
