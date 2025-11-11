/**
 * BillPagination Component
 *
 * Pagination controls for bill search results.
 */

import type { ReactNode } from 'react';

interface BillPaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  baseUrl?: string;
}

export default function BillPagination({
  currentPage,
  hasNextPage,
  hasPrevPage,
  baseUrl = '/bills',
}: BillPaginationProps) {
  const buildPageUrl = (page: number): string => {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      // Server-side: return simple URL with page param
      return page > 1 ? `${baseUrl}?page=${page}` : baseUrl;
    }

    const url = new URL(baseUrl, window.location.origin);

    // Preserve existing query params
    const currentParams = new URLSearchParams(window.location.search);
    for (const [key, value] of currentParams.entries()) {
      if (key !== 'page') {
        url.searchParams.set(key, value);
      }
    }

    if (page > 1) {
      url.searchParams.set('page', page.toString());
    }

    return url.pathname + url.search;
  };

  const PaginationButton = ({
    page,
    children,
    disabled = false,
    active = false,
  }: {
    page?: number;
    children: ReactNode;
    disabled?: boolean;
    active?: boolean;
  }) => {
    if (disabled) {
      return (
        <span className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base text-gray-400 border border-gray-200 rounded-md cursor-not-allowed bg-gray-50">
          {children}
        </span>
      );
    }

    return (
      <a
        href={page ? buildPageUrl(page) : '#'}
        className={`px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base border rounded-md font-medium transition-colors ${
          active
            ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        {children}
      </a>
    );
  };

  return (
    <nav className="flex items-center justify-center gap-1.5 sm:gap-2" aria-label="Pagination">
      {/* Previous button */}
      <PaginationButton
        page={currentPage - 1}
        disabled={!hasPrevPage}
      >
        <span className="sr-only">Previous</span>
        <span className="hidden sm:inline">← Previous</span>
        <span className="sm:hidden">←</span>
      </PaginationButton>

      {/* Page numbers */}
      <div className="hidden md:flex items-center gap-2">
        {currentPage > 2 && (
          <>
            <PaginationButton page={1}>1</PaginationButton>
            {currentPage > 3 && (
              <span className="px-2 text-gray-500">...</span>
            )}
          </>
        )}

        {hasPrevPage && (
          <PaginationButton page={currentPage - 1}>
            {currentPage - 1}
          </PaginationButton>
        )}

        <PaginationButton active>{currentPage}</PaginationButton>

        {hasNextPage && (
          <PaginationButton page={currentPage + 1}>
            {currentPage + 1}
          </PaginationButton>
        )}
      </div>

      {/* Mobile page indicator */}
      <div className="md:hidden px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-600 font-medium">
        Page {currentPage}
      </div>

      {/* Next button */}
      <PaginationButton
        page={currentPage + 1}
        disabled={!hasNextPage}
      >
        <span className="sr-only">Next</span>
        <span className="hidden sm:inline">Next →</span>
        <span className="sm:hidden">→</span>
      </PaginationButton>
    </nav>
  );
}
