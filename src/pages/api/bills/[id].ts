/**
 * GET /api/bills/[id]
 *
 * Get bill details by UUID.
 */

import type { APIRoute } from 'astro';
import { getBillById } from '@/lib/api/bills';

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

    const bill = await getBillById(id);

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
    console.error('Get bill API error:', error);

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
