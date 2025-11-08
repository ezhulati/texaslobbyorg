import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Recover/restore an account that was scheduled for deletion
 * Only works if grace period hasn't expired yet
 */
export const POST: APIRoute = async ({ cookies }) => {
  try {
    // Create auth client with cookie context
    const authClient = createServerAuthClient(cookies);

    // Get the current user
    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      console.error('[Recover Account] Authentication error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Use service role client to cancel deletion
    const supabase = createServerClient();

    const { data: result, error: cancelError } = await supabase
      .rpc('cancel_account_deletion', {
        p_user_id: userId,
      });

    if (cancelError || !result) {
      console.error('[Recover Account] Error cancelling deletion:', cancelError);
      return new Response(
        JSON.stringify({
          error: cancelError?.message || 'Failed to recover account',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse result
    const recoveryResult = typeof result === 'string' ? JSON.parse(result) : result;

    if (!recoveryResult.success) {
      return new Response(
        JSON.stringify({ error: recoveryResult.error }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[Recover Account] Account recovered successfully for user:', userId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Account successfully recovered',
        deletion_id: recoveryResult.deletion_id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Recover Account] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
