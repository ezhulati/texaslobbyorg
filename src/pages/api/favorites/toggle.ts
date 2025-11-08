import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

/**
 * POST /api/favorites/toggle
 * Toggles a lobbyist's favorite status for the authenticated user
 * - If favorited: removes from favorites
 * - If not favorited: adds to favorites
 *
 * Request body: { lobbyistId: string }
 *
 * Returns:
 * - 200: Favorite toggled successfully (includes `isFavorited` boolean)
 * - 400: Missing or invalid lobbyistId
 * - 401: User not authenticated
 * - 404: Lobbyist not found
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication (from middleware)
    if (!locals.isAuthenticated || !locals.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You must be logged in to favorite a lobbyist',
          code: 'UNAUTHORIZED'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { lobbyistId } = body;

    // Validate lobbyistId
    if (!lobbyistId || typeof lobbyistId !== 'string') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid lobbyist ID',
          code: 'INVALID_INPUT'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createServerClient();

    // Verify lobbyist exists and is active
    const { data: lobbyist, error: lobbyistError } = await supabase
      .from('lobbyists')
      .select('id, first_name, last_name, is_active')
      .eq('id', lobbyistId)
      .single();

    if (lobbyistError || !lobbyist) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Lobbyist not found',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if already favorited
    const { data: existingFavorite } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', locals.user.id)
      .eq('lobbyist_id', lobbyistId)
      .maybeSingle();

    let isFavorited: boolean;
    let action: 'added' | 'removed';

    if (existingFavorite) {
      // Already favorited - remove it
      const { error: deleteError } = await supabase
        .from('favorites')
        .delete()
        .eq('id', existingFavorite.id);

      if (deleteError) {
        console.error('[API /favorites/toggle] Delete error:', deleteError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to remove favorite',
            code: 'DATABASE_ERROR'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      isFavorited = false;
      action = 'removed';
    } else {
      // Not favorited - add it
      const { error: insertError } = await supabase
        .from('favorites')
        .insert({
          user_id: locals.user.id,
          lobbyist_id: lobbyistId
        });

      if (insertError) {
        console.error('[API /favorites/toggle] Insert error:', insertError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to add favorite',
            code: 'DATABASE_ERROR'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      isFavorited = true;
      action = 'added';
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          lobbyistId: lobbyist.id,
          lobbyistName: `${lobbyist.first_name} ${lobbyist.last_name}`,
          isFavorited,
          action
        },
        message: action === 'added'
          ? `${lobbyist.first_name} ${lobbyist.last_name} added to your favorites`
          : `${lobbyist.first_name} ${lobbyist.last_name} removed from your favorites`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[API /favorites/toggle] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
