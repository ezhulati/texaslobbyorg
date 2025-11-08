import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Delete account with soft delete and 30-day grace period
 * Allows users to recover their account within the grace period
 * Supports both soft delete (default) and immediate permanent deletion
 */
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

    // Parse request body
    const body = await request.json();
    const {
      password,
      reason,
      immediate = false, // If true, skip grace period
      grace_period_days = 30,
    } = body;

    // Require password confirmation for security
    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Password confirmation required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify password
    const { error: passwordError } = await authClient.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (passwordError) {
      console.error('[Delete Account] Password verification failed:', passwordError);
      return new Response(
        JSON.stringify({ error: 'Incorrect password' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Use service role client for deletion operations
    const supabase = createServerClient();

    if (immediate) {
      // IMMEDIATE PERMANENT DELETION (no grace period)
      console.log('[Delete Account] Performing immediate permanent deletion for user:', userId);

      // Step 1: Delete from users table (cascades to favorites, page_views, etc.)
      const { error: deleteUserError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (deleteUserError) {
        console.error('[Delete Account] Error deleting user data:', deleteUserError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete account data' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Step 2: Delete the auth user
      const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteAuthError) {
        console.error('[Delete Account] Error deleting auth user:', deleteAuthError);
        // This is critical - user data deleted but auth remains
        // Try to recreate user record to prevent orphaned auth
        await supabase.from('users').insert({
          id: userId,
          email: user.email!,
          role: 'searcher',
        }).then(() => {
          console.error('[Delete Account] Rollback: Recreated user record due to auth deletion failure');
        });

        return new Response(
          JSON.stringify({ error: 'Failed to delete authentication account. Please try again or contact support.' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Clear cookies and sign out
      cookies.delete('sb-access-token', { path: '/' });
      cookies.delete('sb-refresh-token', { path: '/' });

      console.log('[Delete Account] Immediate deletion successful for user:', userId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account permanently deleted',
          immediate: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      // SOFT DELETE WITH GRACE PERIOD (default, best practice)
      console.log('[Delete Account] Marking user for deletion with grace period:', grace_period_days, 'days');

      const { data: result, error: markError } = await supabase
        .rpc('mark_user_for_deletion', {
          p_user_id: userId,
          p_reason: reason || null,
          p_grace_period_days: grace_period_days,
        });

      if (markError || !result) {
        console.error('[Delete Account] Error marking for deletion:', markError);
        return new Response(
          JSON.stringify({
            error: markError?.message || 'Failed to schedule account deletion',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Parse result
      const deletionResult = typeof result === 'string' ? JSON.parse(result) : result;

      if (!deletionResult.success) {
        return new Response(
          JSON.stringify({ error: deletionResult.error }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Sign out user immediately (but data remains for grace period)
      await authClient.auth.signOut();
      cookies.delete('sb-access-token', { path: '/' });
      cookies.delete('sb-refresh-token', { path: '/' });

      console.log('[Delete Account] Soft deletion successful. Scheduled for:', deletionResult.scheduled_date);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Account scheduled for deletion',
          scheduled_date: deletionResult.scheduled_date,
          grace_period_days: deletionResult.grace_period_days,
          deletion_id: deletionResult.deletion_id,
          recovery_available: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('[Delete Account] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
