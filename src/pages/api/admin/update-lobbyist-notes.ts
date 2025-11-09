import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

/**
 * Update internal admin notes for a lobbyist (admin only)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Update Lobbyist Notes API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Update Lobbyist Notes API] Not authenticated:', authError);
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
      console.error('[Update Lobbyist Notes API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { lobbyistId, notes } = body;

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
      .select('id, first_name, last_name, email')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Update Lobbyist Notes API] Lobbyist not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Lobbyist not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Update Lobbyist Notes API] Updating notes for lobbyist:', lobbyistId);

    // Update internal notes
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        internal_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('[Update Lobbyist Notes API] Error updating lobbyist:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to update internal notes'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Update Lobbyist Notes API] Notes updated successfully:', lobbyistId);

    // Log audit trail
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'lobbyist_notes_updated',
        p_action_description: `Updated internal notes for ${lobbyist.first_name} ${lobbyist.last_name} (${lobbyist.email})`,
        p_target_user_id: null,
        p_metadata: { lobbyist_id: lobbyistId }
      });
    } catch (auditError) {
      console.warn('[Update Lobbyist Notes API] Failed to log audit trail:', auditError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Internal notes updated successfully',
      lobbyistId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Update Lobbyist Notes API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
