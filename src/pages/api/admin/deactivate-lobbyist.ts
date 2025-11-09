import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Deactivate a lobbyist profile (admin only)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Deactivate Lobbyist API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Deactivate Lobbyist API] Not authenticated:', authError);
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role
    const serverClient = createServerClient();
    const { data: currentUserData } = await serverClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (currentUserData?.role !== 'admin') {
      console.error('[Deactivate Lobbyist API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { lobbyistId } = body;

    if (!lobbyistId) {
      return new Response(JSON.stringify({
        error: 'Lobbyist ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get lobbyist details
    const { data: lobbyist, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('id, first_name, last_name, email, is_active')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Deactivate Lobbyist API] Lobbyist not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Lobbyist not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Deactivate Lobbyist API] Deactivating lobbyist:', lobbyistId);

    // Update is_active status
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('[Deactivate Lobbyist API] Error updating lobbyist:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to deactivate lobbyist profile'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Deactivate Lobbyist API] Lobbyist deactivated successfully:', lobbyistId);

    // Log audit trail
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'lobbyist_deactivated',
        p_action_description: `Deactivated lobbyist profile: ${lobbyist.first_name} ${lobbyist.last_name} (${lobbyist.email})`,
        p_target_user_id: null,
        p_metadata: { lobbyist_id: lobbyistId, previous_status: lobbyist.is_active }
      });
    } catch (auditError) {
      console.warn('[Deactivate Lobbyist API] Failed to log audit trail:', auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Lobbyist profile deactivated: ${lobbyist.first_name} ${lobbyist.last_name}`,
      lobbyistId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Deactivate Lobbyist API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
