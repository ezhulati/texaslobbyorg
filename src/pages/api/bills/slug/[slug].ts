/**
 * GET /api/bills/slug/[slug]
 *
 * Get bill details by slug (e.g., "89r-hb-1").
 */

import type { APIRoute } from 'astro';
import { getBillBySlug } from '@/lib/api/bills';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { slug } = params;

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Bill slug is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const bill = await getBillBySlug(slug);

    if (!bill) {
      return new Response(
        JSON.stringify({ error: 'Bill not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ bill }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get bill by slug API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to get bill',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
