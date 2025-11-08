import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

/**
 * POST /api/favorites/remove
 * Removes a lobbyist from the authenticated user's favorites
 *
 * Request body: { lobbyistId: string }
 *
 * Returns:
 * - 200: Favorite removed successfully
 * - 400: Missing or invalid lobbyistId
 * - 401: User not authenticated
 * - 404: Favorite not found (wasn't favorited)
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication (from middleware)
    if (!locals.isAuthenticated || !locals.user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You must be logged in to manage favorites',
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

    // Delete the favorite
    const { data: deletedFavorite, error: deleteError } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', locals.user.id)
      .eq('lobbyist_id', lobbyistId)
      .select()
      .maybeSingle();

    if (deleteError) {
      console.error('[API /favorites/remove] Database error:', deleteError);
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

    // Check if favorite existed
    if (!deletedFavorite) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This lobbyist was not in your favorites',
          code: 'NOT_FOUND'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          favoriteId: deletedFavorite.id,
          lobbyistId: lobbyistId,
          deletedAt: new Date().toISOString()
        },
        message: 'Removed from your favorites'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[API /favorites/remove] Unexpected error:', error);
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
