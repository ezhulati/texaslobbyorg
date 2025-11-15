/**
 * WatchlistButton Component
 *
 * Button to add/remove bills from user's watchlist.
 * Shows different states: add, remove, loading, error.
 * Only renders if user is authenticated.
 */

import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';

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

  // Resolve userId via API; check status; auto-add after login intent
  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch('/api/auth/me');
        if (resp.ok) {
          const json = await resp.json();
          const uid = json.userId || null;
          setUserId(uid);
          if (uid) {
            await checkWatchlistStatus(uid);
            // Auto-add if returning from login with intent
            const url = new URL(window.location.href);
            if (url.searchParams.get('intent') === 'watchlist' && url.searchParams.get('billId') === billId && !isInWatchlist) {
              // Clean intent before action to avoid loops
              url.searchParams.delete('intent');
              history.replaceState(null, '', url.pathname + url.search);
              handleToggleWatchlist();
            }
          }
        }
      } catch {}
    })();
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
      // Redirect to login with return URL and intent
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('intent', 'watchlist');
        url.searchParams.set('billId', billId);
        window.location.href = `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`;
        return;
      } catch {
        setError('Please log in to use watchlist');
        return;
      }
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
        setSuccessToast('Removed from watchlist');
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
        setSuccessToast('Added to watchlist');
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

  const [successToast, setSuccessToast] = useState<string | null>(null);
  useEffect(() => {
    if (successToast) {
      const t = setTimeout(() => setSuccessToast(null), 2000);
      return () => clearTimeout(t);
    }
  }, [successToast]);

  const tooltipAdd = 'Add this bill to your watchlist to get updates and find it later';
  const tooltipRemove = 'Remove this bill from your watchlist';

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
        title={isInWatchlist ? tooltipRemove : tooltipAdd}
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
      <div className="relative inline-block">
        <button
          onClick={handleToggleWatchlist}
          disabled={isLoading}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            isInWatchlist
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isInWatchlist ? tooltipRemove : tooltipAdd}
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
        <div className="absolute -top-1 -right-1 group">
          <Info className="w-4 h-4 text-gray-400 bg-white rounded-full shadow p-0.5" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap z-10">
            {isInWatchlist ? tooltipRemove : tooltipAdd}
          </span>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="flex flex-col gap-2">
      <div className="relative inline-block">
        <button
          onClick={handleToggleWatchlist}
          disabled={isLoading}
          className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-medium rounded-md transition-colors ${
            isInWatchlist
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isInWatchlist ? tooltipRemove : tooltipAdd}
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
        <div className="absolute -top-1 -right-1 group">
          <Info className="w-4 h-4 text-gray-400 bg-white rounded-full shadow p-0.5" />
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap z-10">
            {isInWatchlist ? tooltipRemove : tooltipAdd}
          </span>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {successToast && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-2">
          {successToast}
        </div>
      )}
    </div>
  );
}
