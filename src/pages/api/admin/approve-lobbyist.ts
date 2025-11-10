import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail, profileApprovedEmail } from '@/lib/email';

/**
 * Approve a lobbyist profile (admin only)
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Approve Lobbyist API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Approve Lobbyist API] Not authenticated:', authError);
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
      console.error('[Approve Lobbyist API] User is not admin');
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
      .select('id, first_name, last_name, email, slug, approval_status')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Approve Lobbyist API] Lobbyist not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Lobbyist not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Approve Lobbyist API] Approving lobbyist:', lobbyistId);

    // Update approval status AND clear rejection fields
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        // Set approval status
        approval_status: 'approved',
        // Clear rejection tracking fields so dashboard shows approved state
        is_rejected: false,
        rejection_reason: null,
        rejected_at: null,
        rejected_by: null,
        // Keep rejection_count for historical tracking
        updated_at: new Date().toISOString()
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('[Approve Lobbyist API] Error updating lobbyist:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to approve lobbyist profile'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Approve Lobbyist API] Lobbyist approved successfully:', lobbyistId);

    // Log audit trail
    try {
      await serverClient.rpc('log_admin_action', {
        p_admin_id: user.id,
        p_action_type: 'lobbyist_approved',
        p_action_description: `Approved lobbyist profile: ${lobbyist.first_name} ${lobbyist.last_name} (${lobbyist.email})`,
        p_target_user_id: null,
        p_metadata: { lobbyist_id: lobbyistId, previous_status: lobbyist.approval_status }
      });
    } catch (auditError) {
      console.warn('[Approve Lobbyist API] Failed to log audit trail:', auditError);
    }

    // Send approval email notification
    if (lobbyist.email) {
      try {
        const profileUrl = `https://texaslobby.org/lobbyists/${lobbyist.slug}`;
        const emailTemplate = profileApprovedEmail(
          `${lobbyist.first_name} ${lobbyist.last_name}`,
          profileUrl
        );
        const emailResult = await sendEmail({
          to: lobbyist.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html
        });

        if (emailResult.error) {
          console.warn('[Approve Lobbyist API] Failed to send approval email:', emailResult.error);
        } else {
          console.log('[Approve Lobbyist API] Approval email sent successfully to:', lobbyist.email);
        }
      } catch (emailError: any) {
        console.warn('[Approve Lobbyist API] Error sending approval email:', emailError);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Lobbyist profile approved: ${lobbyist.first_name} ${lobbyist.last_name}`,
      lobbyistId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Approve Lobbyist API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
