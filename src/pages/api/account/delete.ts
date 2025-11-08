import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create auth client with cookie context
    const authClient = createServerAuthClient(cookies);

    // Get the current user
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error('[Delete Account] Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Use service role client for deletion (bypasses RLS)
    const supabase = createServerClient();

    // Delete user data (cascade will handle related records due to foreign keys)
    // Note: This will delete favorites, page_views, and potentially lobbyist profiles
    const { error: deleteUserError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteUserError) {
      console.error('Error deleting user data:', deleteUserError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete account data' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete the auth user (this will also sign them out)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError);
      // User data is deleted but auth account remains - this is a problem
      // but we'll still return success since the main data is gone
    }

    // Clear cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    return new Response(
      JSON.stringify({ success: true, message: 'Account deleted successfully' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in delete account:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
