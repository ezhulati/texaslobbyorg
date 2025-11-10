/**
 * Bill Search Query Builder Service
 *
 * Provides utilities for building and executing bill search queries
 * with pagination, filtering, and sorting.
 */

import type { BillSearchFilters, BillSearchResult } from '@/lib/types/bills';
import { searchBills } from '@/lib/api/bills';

/**
 * Parse search query from URL parameters
 */
export function parseSearchParams(searchParams: URLSearchParams): BillSearchFilters {
  const query = searchParams.get('q') || undefined;
  const chamber = searchParams.get('chamber') as 'house' | 'senate' | undefined;
  const status = searchParams.get('status') || undefined;
  const session = searchParams.get('session') || undefined;

  // Parse subjects (comma-separated)
  const subjectsParam = searchParams.get('subjects');
  const subjects = subjectsParam
    ? subjectsParam.split(',').map(s => s.trim()).filter(Boolean)
    : undefined;

  // Parse pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = (page - 1) * limit;

  return {
    query,
    chamber,
    status: status as any,
    session,
    subjects,
    limit,
    offset,
  };
}

/**
 * Build URL search params from filters
 */
export function buildSearchParams(filters: BillSearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.query) params.set('q', filters.query);
  if (filters.chamber) params.set('chamber', filters.chamber);
  if (filters.status) params.set('status', filters.status);
  if (filters.session) params.set('session', filters.session);
  if (filters.subjects && filters.subjects.length > 0) {
    params.set('subjects', filters.subjects.join(','));
  }

  const page = filters.offset && filters.limit
    ? Math.floor(filters.offset / filters.limit) + 1
    : 1;

  if (page > 1) params.set('page', page.toString());
  if (filters.limit && filters.limit !== 20) {
    params.set('limit', filters.limit.toString());
  }

  return params;
}

/**
 * Execute bill search with filters
 */
export async function executeBillSearch(filters: BillSearchFilters): Promise<{
  bills: BillSearchResult[];
  pagination: {
    page: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  const limit = filters.limit || 20;
  const offset = filters.offset || 0;
  const page = Math.floor(offset / limit) + 1;

  // Search with limit + 1 to check if there are more results
  const bills = await searchBills({
    ...filters,
    limit: limit + 1,
  });

  const hasMore = bills.length > limit;
  const resultsToReturn = hasMore ? bills.slice(0, limit) : bills;

  return {
    bills: resultsToReturn,
    pagination: {
      page,
      limit,
      offset,
      hasMore,
    },
  };
}

/**
 * Get suggested search terms from bill titles and summaries
 */
export function getSuggestedSearchTerms(bills: BillSearchResult[]): string[] {
  const terms = new Set<string>();

  bills.forEach(bill => {
    // Extract keywords from title
    if (bill.title) {
      const titleWords = bill.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 4); // Only words longer than 4 chars

      titleWords.forEach(word => terms.add(word));
    }

    // Add subject areas
    if (bill.subject_areas) {
      bill.subject_areas.forEach(subject => terms.add(subject.toLowerCase()));
    }
  });

  return Array.from(terms).slice(0, 10); // Return top 10 suggestions
}

/**
 * Build search query description for display
 */
export function getSearchDescription(filters: BillSearchFilters): string {
  const parts: string[] = [];

  if (filters.query) {
    parts.push(`matching "${filters.query}"`);
  }

  if (filters.chamber) {
    parts.push(`in ${filters.chamber === 'house' ? 'House' : 'Senate'}`);
  }

  if (filters.status) {
    parts.push(`with status "${filters.status.replace(/_/g, ' ')}"`);
  }

  if (filters.session) {
    parts.push(`from session ${filters.session}`);
  }

  if (filters.subjects && filters.subjects.length > 0) {
    parts.push(`about ${filters.subjects.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'All bills';
  }

  return `Bills ${parts.join(' ')}`;
}

/**
 * Validate search filters
 */
export function validateSearchFilters(filters: BillSearchFilters): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[];

  // Validate limit
  if (filters.limit !== undefined) {
    if (filters.limit < 1 || filters.limit > 100) {
      errors.push('Limit must be between 1 and 100');
    }
  }

  // Validate offset
  if (filters.offset !== undefined && filters.offset < 0) {
    errors.push('Offset must be non-negative');
  }

  // Validate chamber
  if (filters.chamber && !['house', 'senate'].includes(filters.chamber)) {
    errors.push('Chamber must be "house" or "senate"');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
