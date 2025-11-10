/**
 * Watchlist Bills API Route
 *
 * GET  /api/watchlist/[userId]/bills - Get user's watchlist
 * POST /api/watchlist/[userId]/bills - Add bill to watchlist
 */

import type { APIRoute } from 'astro';
import { addToWatchlist, getUserWatchlist } from '@/lib/api/bills';

export const GET: APIRoute = async ({ params }) => {
  const { userId } = params;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const bills = await getUserWatchlist(userId);

    return new Response(JSON.stringify({ bills }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching watchlist:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to fetch watchlist',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const { userId } = params;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { bill_id, preferences } = body;

    if (!bill_id) {
      return new Response(JSON.stringify({ error: 'Bill ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const entry = await addToWatchlist(userId, bill_id, preferences);

    return new Response(JSON.stringify({ entry }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error adding to watchlist:', error);

    const message = error instanceof Error ? error.message : 'Failed to add to watchlist';
    const status = message.includes('already in') ? 409 : 500;

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
