import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail, profileRejectedEmail } from '@/lib/email';

/**
 * Reject a lobbyist profile (admin only)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Reject Lobbyist API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Reject Lobbyist API] Not authenticated:', authError);
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
      console.error('[Reject Lobbyist API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await request.json();
    const { lobbyistId, reason } = body;

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
      .select('id, first_name, last_name, email, approval_status, rejection_count')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Reject Lobbyist API] Lobbyist not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Lobbyist not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Reject Lobbyist API] Rejecting lobbyist:', lobbyistId);

    // Get current rejection count to increment it
    const currentCount = lobbyist.rejection_count || 0;

    // Update both approval_status AND rejection tracking fields
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        // New approval system
        approval_status: 'rejected',
        // Legacy rejection tracking (for user dashboard)
        is_rejected: true,
        rejection_reason: reason || 'Profile requires revision',
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_count: currentCount + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('[Reject Lobbyist API] Error updating lobbyist:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to reject lobbyist profile'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Reject Lobbyist API] Lobbyist rejected successfully:', lobbyistId);

    // Log audit trail
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'lobbyist_rejected',
        p_action_description: `Rejected lobbyist profile: ${lobbyist.first_name} ${lobbyist.last_name} (${lobbyist.email})`,
        p_target_user_id: null,
        p_metadata: { lobbyist_id: lobbyistId, previous_status: lobbyist.approval_status, reason }
      });
    } catch (auditError) {
      console.warn('[Reject Lobbyist API] Failed to log audit trail:', auditError);
    }

    // Send email notification to lobbyist
    if (lobbyist.email) {
      try {
        const emailTemplate = profileRejectedEmail(
          `${lobbyist.first_name} ${lobbyist.last_name}`,
          reason || 'Profile requires revision',
          currentCount + 1
        );
        const emailResult = await sendEmail({
          to: lobbyist.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });

        if (emailResult.error) {
          console.warn('[Reject Lobbyist API] Failed to send rejection email:', emailResult.error);
        } else {
          console.log('[Reject Lobbyist API] Rejection email sent successfully to:', lobbyist.email);
        }
      } catch (emailError: any) {
        console.warn('[Reject Lobbyist API] Error sending rejection email:', emailError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Lobbyist profile rejected: ${lobbyist.first_name} ${lobbyist.last_name}`,
      lobbyistId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Reject Lobbyist API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
