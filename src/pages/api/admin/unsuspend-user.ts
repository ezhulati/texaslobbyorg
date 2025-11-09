import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Unsuspend (lift suspension) from a user account (admin only)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Unsuspend User API] POST request received');

    // Get authenticated user using cookies
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Unsuspend User API] Not authenticated:', authError);
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role using service client
    const serverClient = createServerClient();
    const { data: currentUserData } = await serverClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserData?.role !== 'admin') {
      console.error('[Unsuspend User API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { userId: targetUserId } = body;

    if (!targetUserId) {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get target user details
    const { data: targetUser, error: fetchError } = await serverClient
      .from('users')
      .select('id, email, full_name, is_suspended')
      .eq('id', targetUserId)
      .single();

    if (fetchError || !targetUser) {
      console.error('[Unsuspend User API] User not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is actually suspended
    if (!targetUser.is_suspended) {
      return new Response(JSON.stringify({
        error: 'User is not currently suspended',
        isNotSuspended: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Unsuspend User API] Unsuspending user:', targetUserId);

    // STEP 1: Deactivate active suspensions for this user
    const { error: deactivateError } = await serverClient
      .from('user_suspensions')
      .update({
        is_active: false,
        unsuspended_at: new Date().toISOString(),
        unsuspended_by: user.id
      })
      .eq('user_id', targetUserId)
      .eq('is_active', true);

    if (deactivateError) {
      console.error('[Unsuspend User API] Error deactivating suspensions:', deactivateError);
      return new Response(JSON.stringify({
        error: 'Failed to deactivate suspension records'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: Update user suspended flag
    const { error: updateError } = await serverClient
      .from('users')
      .update({
        is_suspended: false,
        suspended_at: null
      })
      .eq('id', targetUserId);

    if (updateError) {
      console.error('[Unsuspend User API] Error updating user:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to unsuspend user account'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Unsuspend User API] User unsuspended successfully:', targetUserId);

    // Log audit trail
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'user_unsuspended',
        p_action_description: `Unsuspended user ${targetUser.email}`,
        p_target_user_id: targetUserId,
        p_metadata: null
      });
    } catch (auditError) {
      console.warn('[Unsuspend User API] Failed to log audit trail:', auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `User ${targetUser.full_name || targetUser.email} has been unsuspended and can now log in`,
      userId: targetUserId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Unsuspend User API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
