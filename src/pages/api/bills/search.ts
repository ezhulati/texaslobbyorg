/**
 * GET /api/bills/search
 *
 * Search for bills with filters and pagination.
 *
 * Query parameters:
 * - q: Search query (keywords)
 * - subjects: Comma-separated subject areas
 * - session: Legislative session code (e.g., "89R")
 * - chamber: "house" or "senate"
 * - status: Bill status
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 */

import type { APIRoute } from 'astro';
import { parseSearchParams, executeBillSearch, validateSearchFilters } from '@/lib/services/billSearch';

export const GET: APIRoute = async ({ url }) => {
  try {
    // Parse search filters from URL
    const filters = parseSearchParams(url.searchParams);

    // Validate filters
    const validation = validateSearchFilters(filters);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: 'Invalid search parameters',
          details: validation.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Execute search
    const result = await executeBillSearch(filters);

    return new Response(
      JSON.stringify({
        bills: result.bills,
        pagination: result.pagination,
        filters,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Bill search API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to search bills',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
