import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail, profileDeletedEmail } from '@/lib/email';

/**
 * Delete a lobbyist profile (admin only)
 * WARNING: This is a destructive action that cannot be undone
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Delete Lobbyist API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Delete Lobbyist API] Not authenticated:', authError);
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
      console.error('[Delete Lobbyist API] User is not admin');
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

    // Get lobbyist details for audit log
    const { data: lobbyist, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('id, first_name, last_name, email, subscription_tier')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Delete Lobbyist API] Lobbyist not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Lobbyist not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Delete Lobbyist API] Deleting lobbyist:', lobbyistId);

    // Log audit trail BEFORE deletion
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'lobbyist_deleted',
        p_action_description: `DELETED lobbyist profile: ${lobbyist.first_name} ${lobbyist.last_name} (${lobbyist.email})`,
        p_target_user_id: null,
        p_metadata: {
          lobbyist_id: lobbyistId,
          lobbyist_email: lobbyist.email,
          lobbyist_name: `${lobbyist.first_name} ${lobbyist.last_name}`,
          subscription_tier: lobbyist.subscription_tier
        }
      });
    } catch (auditError) {
      console.warn('[Delete Lobbyist API] Failed to log audit trail:', auditError);
    }

    // Send email notification BEFORE deletion
    if (lobbyist.email) {
      try {
        const emailTemplate = profileDeletedEmail(`${lobbyist.first_name} ${lobbyist.last_name}`);
        const emailResult = await sendEmail({
          to: lobbyist.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });

        if (emailResult.error) {
          console.warn('[Delete Lobbyist API] Failed to send deletion email:', emailResult.error);
        } else {
          console.log('[Delete Lobbyist API] Deletion email sent successfully to:', lobbyist.email);
        }
      } catch (emailError: any) {
        console.warn('[Delete Lobbyist API] Error sending deletion email:', emailError);
      }
    }

    // Delete the lobbyist (cascades to favorites and page_views via ON DELETE CASCADE)
    const { error: deleteError } = await serverClient
      .from('lobbyists')
      .delete()
      .eq('id', lobbyistId);

    if (deleteError) {
      console.error('[Delete Lobbyist API] Error deleting lobbyist:', deleteError);
      return new Response(JSON.stringify({
        error: 'Failed to delete lobbyist profile'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Delete Lobbyist API] Lobbyist deleted successfully:', lobbyistId);

    return new Response(JSON.stringify({
      success: true,
      message: `Lobbyist profile permanently deleted: ${lobbyist.first_name} ${lobbyist.last_name}`,
      lobbyistId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Delete Lobbyist API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
