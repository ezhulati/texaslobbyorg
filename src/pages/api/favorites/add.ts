import type { APIRoute } from 'astro';
import { createServerClient } from '@/lib/supabase';

/**
 * POST /api/favorites/add
 * Adds a lobbyist to the authenticated user's favorites
 *
 * Request body: { lobbyistId: string }
 *
 * Returns:
 * - 200: Favorite added successfully
 * - 400: Missing or invalid lobbyistId
 * - 401: User not authenticated
 * - 404: Lobbyist not found
 * - 409: Already favorited (duplicate)
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

    // Add to favorites
    const { data: favorite, error: favoriteError } = await supabase
      .from('favorites')
      .insert({
        user_id: locals.user.id,
        lobbyist_id: lobbyistId
      })
      .select()
      .single();

    if (favoriteError) {
      // Check for duplicate constraint violation (PostgreSQL error code 23505)
      if (favoriteError.code === '23505') {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'You have already favorited this lobbyist',
            code: 'ALREADY_FAVORITED'
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Other database errors
      console.error('[API /favorites/add] Database error:', favoriteError);
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

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          favoriteId: favorite.id,
          lobbyistId: lobbyist.id,
          lobbyistName: `${lobbyist.first_name} ${lobbyist.last_name}`,
          createdAt: favorite.created_at
        },
        message: `${lobbyist.first_name} ${lobbyist.last_name} added to your favorites`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[API /favorites/add] Unexpected error:', error);
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
