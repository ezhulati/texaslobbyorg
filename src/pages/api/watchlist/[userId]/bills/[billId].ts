/**
 * Watchlist Bill API Route
 *
 * DELETE /api/watchlist/[userId]/bills/[billId] - Remove bill from watchlist
 */

import type { APIRoute } from 'astro';
import { removeFromWatchlist } from '@/lib/api/bills';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

function createServerClient() {
  const supabaseUrl = import.meta.env.SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  return createClient<Database>(supabaseUrl, supabaseKey);
}

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

export const PATCH: APIRoute = async ({ params, request }) => {
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
    const body = await request.json();
    const { notifications_enabled, notification_types } = body;

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('watchlist_entries')
      .update({
        notifications_enabled: notifications_enabled,
        notification_types: notification_types ?? null,
      })
      .eq('user_id', userId)
      .eq('bill_id', billId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ entry: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating watchlist entry:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to update watchlist entry',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
