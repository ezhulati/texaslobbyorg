/**
 * GET /api/bills/[id]/updates
 *
 * Get bill update history (status changes, amendments, votes, etc.)
 */

import type { APIRoute } from 'astro';
import { getBillUpdates } from '@/lib/api/bills';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Bill ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const updates = await getBillUpdates(id);

    return new Response(
      JSON.stringify({ updates }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Get bill updates API error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to get bill updates',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
