/**
 * Watchlist Bill API Route
 *
 * DELETE /api/watchlist/[userId]/bills/[billId] - Remove bill from watchlist
 */

import type { APIRoute } from 'astro';
import { removeFromWatchlist } from '@/lib/api/bills';

export const DELETE: APIRoute = async ({ params }) => {
  const { userId, billId } = params;

  if (!userId || !billId) {
    return new Response(
      JSON.stringify({ error: 'User ID and Bill ID are required' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    await removeFromWatchlist(userId, billId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error removing from watchlist:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to remove from watchlist',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
