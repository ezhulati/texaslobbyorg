import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create authenticated Supabase client with cookies
    const supabaseAuth = createServerAuthClient(cookies);

    // Get user from session
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use service role client for database operations
    const supabase = createServerClient();

    // Get the lobbyist profile
    const { data: lobbyist, error: lobbyistError } = await supabase
      .from('lobbyists')
      .select('id, is_active, user_id, claimed_by')
      .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`)
      .single();

    if (lobbyistError || !lobbyist) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Lobbyist profile not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Toggle the is_active status
    const newStatus = !lobbyist.is_active;

    const { error: updateError } = await supabase
      .from('lobbyists')
      .update({ is_active: newStatus })
      .eq('id', lobbyist.id);

    if (updateError) {
      console.error('Error toggling visibility:', updateError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to update visibility'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      is_active: newStatus,
      message: newStatus ? 'Profile is now listed in directory' : 'Profile is now unlisted from directory'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
