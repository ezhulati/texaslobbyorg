import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail, profileApprovedEmail } from '@/lib/email';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Approve Profile API] POST request received');

    // Get authenticated user using cookies
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Approve Profile API] Not authenticated:', authError);
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role using service client
    const serverClient = createServerClient();
    const { data: userData } = await serverClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      console.error('[Approve Profile API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get form data (sent from PendingProfileActions component)
    const formData = await request.formData();
    const profileId = formData.get('profileId') as string;

    if (!profileId) {
      console.error('[Approve Profile API] Missing profileId');
      return new Response(JSON.stringify({
        error: 'Missing profile ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Approve Profile API] Approving profile:', profileId);

    // Get lobbyist profile
    const { data: lobbyist, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('*')
      .eq('id', profileId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Approve Profile API] Profile not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Profile not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Approve profile and clear any rejection state
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        is_pending: false,
        is_active: true,
        is_verified: true,
        approval_status: 'approved', // Set approval status
        pending_reason: null,
        // Clear rejection fields if profile was previously rejected
        is_rejected: false,
        rejection_reason: null,
        rejection_category: null,
        rejected_at: null,
        rejected_by: null,
        // Don't reset rejection_count or last_resubmission_at (keep for audit trail)
      })
      .eq('id', profileId);

    if (updateError) {
      console.error('[Approve Profile API] Error approving profile:', updateError);
      return new Response(JSON.stringify({
        error: 'Error approving profile'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Approve Profile API] Profile approved successfully');

    // Send approval email
    let emailSent = false;
    if (lobbyist.email) {
      try {
        const profileUrl = `${import.meta.env.PUBLIC_SITE_URL}/lobbyists/${lobbyist.slug}`;
        const emailTemplate = profileApprovedEmail(
          `${lobbyist.first_name} ${lobbyist.last_name}`,
          profileUrl
        );

        const emailResult = await sendEmail({
          to: lobbyist.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        if (emailResult.error) {
          console.error('[Approve Profile API] Error sending email:', emailResult.error);
        } else {
          emailSent = true;
          console.log('[Approve Profile API] Approval email sent to:', lobbyist.email);
        }
      } catch (emailError) {
        console.error('[Approve Profile API] Email sending failed:', emailError);
        // Don't fail the approval if email fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Profile approved successfully',
      emailSent,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Approve Profile API] Unexpected error:', error);
    console.error('[Approve Profile API] Error stack:', error?.stack);
    console.error('[Approve Profile API] Error message:', error?.message);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error?.message || 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
