/**
 * WatchlistButton Component
 *
 * Button to add/remove bills from user's watchlist.
 * Shows different states: add, remove, loading, error.
 * Only renders if user is authenticated.
 */

import { useState, useEffect } from 'react';

interface WatchlistButtonProps {
  billId: string;
  billNumber: string;
  variant?: 'default' | 'icon' | 'compact';
  onSuccess?: () => void;
  isAuthenticated: boolean;
}

export default function WatchlistButton({
  billId,
  billNumber,
  variant = 'default',
  onSuccess,
  isAuthenticated,
}: WatchlistButtonProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID from cookies on mount
  useEffect(() => {
    if (isAuthenticated) {
      // Get user ID from cookie or session
      const userIdFromCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('user_id='))
        ?.split('=')[1];
      setUserId(userIdFromCookie || null);
      if (userIdFromCookie) {
        checkWatchlistStatus(userIdFromCookie);
      }
    }
  }, [isAuthenticated, billId]);

  const checkWatchlistStatus = async (uid: string) => {
    try {
      const response = await fetch(`/api/watchlist/${uid}/bills`);

      if (response.ok) {
        const { bills } = await response.json();
        const inWatchlist = bills.some((b: any) => b.bill_id === billId);
        setIsInWatchlist(inWatchlist);
      }
    } catch (err) {
      console.error('Failed to check watchlist status:', err);
    }
  };

  const handleToggleWatchlist = async () => {
    if (!userId) {
      setError('Please log in to use watchlist');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const response = await fetch(`/api/watchlist/${userId}/bills/${billId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to remove from watchlist');
        }

        setIsInWatchlist(false);
      } else {
        // Add to watchlist
        const response = await fetch(`/api/watchlist/${userId}/bills`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bill_id: billId }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to add to watchlist');
        }

        setIsInWatchlist(true);
      }

      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggleWatchlist}
        disabled={isLoading}
        className={`p-2 rounded-md transition-colors ${
          isInWatchlist
            ? 'text-blue-600 hover:bg-blue-50'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
        aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      >
        <svg
          className="w-5 h-5"
          fill={isInWatchlist ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
      </button>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <button
        onClick={handleToggleWatchlist}
        disabled={isLoading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          isInWatchlist
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg
          className="w-4 h-4"
          fill={isInWatchlist ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        {isInWatchlist ? 'Watching' : 'Watch'}
      </button>
    );
  }

  // Default variant
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleToggleWatchlist}
        disabled={isLoading}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-md transition-colors ${
          isInWatchlist
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg
          className="w-5 h-5"
          fill={isInWatchlist ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        {isLoading
          ? 'Loading...'
          : isInWatchlist
          ? 'Remove from Watchlist'
          : 'Add to Watchlist'}
      </button>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
