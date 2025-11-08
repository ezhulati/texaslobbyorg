import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Reject Role Upgrade API] POST request received');

    // Get authenticated user and verify admin role
    const authClient = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error('[Reject Role Upgrade API] Not authenticated');
      return new Response(null, {
        status: 302,
        headers: { Location: '/login' },
      });
    }

    // Use server client for admin operations
    const serverClient = createServerClient();

    // Verify user is admin
    const { data: userData } = await serverClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      console.error('[Reject Role Upgrade API] User is not an admin');
      return new Response(null, {
        status: 302,
        headers: { Location: '/dashboard' },
      });
    }

    // Get upgrade_id and optional rejection reason from form data
    const formData = await request.formData();
    const upgradeId = formData.get('upgrade_id');
    const rejectionReason = formData.get('rejection_reason') || 'Your role upgrade request could not be approved at this time. Please contact support if you have questions.';

    if (!upgradeId) {
      return new Response('Upgrade ID is required', {
        status: 400,
      });
    }

    console.log('[Reject Role Upgrade API] Rejecting upgrade:', upgradeId);

    // Fetch the upgrade request
    const { data: upgradeRequest, error: fetchError } = await serverClient
      .from('role_upgrade_requests')
      .select(`
        id,
        user_id,
        status,
        users!inner (
          email,
          full_name
        )
      `)
      .eq('id', upgradeId)
      .single();

    if (fetchError || !upgradeRequest) {
      console.error('[Reject Role Upgrade API] Upgrade request not found:', fetchError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/role-upgrades?error=not_found' },
      });
    }

    if (upgradeRequest.status !== 'pending') {
      console.error('[Reject Role Upgrade API] Upgrade request is not pending');
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/role-upgrades?error=not_pending' },
      });
    }

    // STEP 1: Update the upgrade request to rejected
    const { error: updateUpgradeError } = await serverClient
      .from('role_upgrade_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason as string,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', upgradeId);

    if (updateUpgradeError) {
      console.error('[Reject Role Upgrade API] Error updating upgrade request:', updateUpgradeError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/role-upgrades?error=update_failed' },
      });
    }

    // STEP 2: Send rejection email to user
    try {
      await sendEmail({
        to: upgradeRequest.users.email,
        subject: 'Role Upgrade Request - Action Required',
        html: `
          <h2>Role Upgrade Request Status</h2>
          <p>Thank you for your interest in upgrading your account to a lobbyist profile on TexasLobby.org.</p>

          <p>After reviewing your request, we're unable to approve it at this time.</p>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d;">${rejectionReason}</p>
          </div>

          <h3>What You Can Do:</h3>
          <ul>
            <li>If you believe this is an error, please contact us at <a href="mailto:support@texaslobby.org">support@texaslobby.org</a></li>
            <li>Ensure you meet the requirements:
              <ul>
                <li>Must be a registered or planning-to-register Texas lobbyist</li>
                <li>Must demonstrate genuine lobbying intent</li>
                <li>Account must not appear suspicious or fraudulent</li>
              </ul>
            </li>
            <li>You can reapply after addressing the concerns mentioned above</li>
          </ul>

          <h3>Still Want to Access Lobbyist Profiles?</h3>
          <p>You can continue using your searcher account to:</p>
          <ul>
            <li>Search for Texas lobbyists</li>
            <li>Save favorites</li>
            <li>View lobbyist profiles and contact information</li>
          </ul>

          <p style="margin-top: 30px;">
            <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">Browse Lobbyists</a>
          </p>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            If you have any questions, please contact us at <a href="mailto:support@texaslobby.org">support@texaslobby.org</a>
          </p>
        `
      });
      console.log('[Reject Role Upgrade API] Rejection email sent to user');
    } catch (emailError) {
      console.error('[Reject Role Upgrade API] Failed to send rejection email:', emailError);
      // Don't fail - rejection was successful
    }

    console.log('[Reject Role Upgrade API] Role upgrade rejected successfully');

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/role-upgrades?success=rejected' },
    });

  } catch (error: any) {
    console.error('[Reject Role Upgrade API] Unexpected error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/role-upgrades?error=unexpected' },
    });
  }
};
