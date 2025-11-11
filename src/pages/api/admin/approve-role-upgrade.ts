import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Approve Role Upgrade API] POST request received');

    // Get authenticated user and verify admin role
    const authClient = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error('[Approve Role Upgrade API] Not authenticated');
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
      console.error('[Approve Role Upgrade API] User is not an admin');
      return new Response(null, {
        status: 302,
        headers: { Location: '/dashboard' },
      });
    }

    // Get upgrade_id from form data
    const formData = await request.formData();
    const upgradeId = formData.get('upgrade_id');

    if (!upgradeId) {
      return new Response('Upgrade ID is required', {
        status: 400,
      });
    }

    console.log('[Approve Role Upgrade API] Approving upgrade:', upgradeId);

    // Fetch the upgrade request
    const { data: upgradeRequest, error: fetchError } = await serverClient
      .from('role_upgrade_requests')
      .select(`
        id,
        user_id,
        from_role,
        to_role,
        status,
        users!inner (
          email,
          full_name
        )
      `)
      .eq('id', upgradeId)
      .single();

    if (fetchError || !upgradeRequest) {
      console.error('[Approve Role Upgrade API] Upgrade request not found:', fetchError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/role-upgrades?error=not_found' },
      });
    }

    if (upgradeRequest.status !== 'pending') {
      console.error('[Approve Role Upgrade API] Upgrade request is not pending');
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/role-upgrades?error=not_pending' },
      });
    }

    // STEP 1: Update the upgrade request to approved
    const { error: updateUpgradeError } = await serverClient
      .from('role_upgrade_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', upgradeId);

    if (updateUpgradeError) {
      console.error('[Approve Role Upgrade API] Error updating upgrade request:', updateUpgradeError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/role-upgrades?error=update_failed' },
      });
    }

    // STEP 2: Update the user's role to lobbyist
    const { error: updateRoleError } = await serverClient
      .from('users')
      .update({ role: upgradeRequest.to_role })
      .eq('id', upgradeRequest.user_id);

    if (updateRoleError) {
      console.error('[Approve Role Upgrade API] Error updating user role:', updateRoleError);
      // Rollback upgrade approval
      await serverClient
        .from('role_upgrade_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', upgradeId);

      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/role-upgrades?error=role_update_failed' },
      });
    }

    // STEP 3: Send approval email to user
    try {
      await sendEmail({
        to: upgradeRequest.users.email,
        subject: 'Role Upgrade Approved - Welcome to TexasLobby.org!',
        html: `
          <h2>Your Role Upgrade Has Been Approved!</h2>
          <p>Great news! Your request to upgrade your account to a lobbyist has been approved.</p>

          <h3>What's Next?</h3>
          <ol>
            <li>
              <strong>Create or Claim Your Profile:</strong>
              <ul>
                <li>If you're already in our TEC database, you can <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/claim-profile">claim your existing profile</a></li>
                <li>Otherwise, <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/signup">create your profile from scratch</a></li>
              </ul>
            </li>
            <li><strong>Complete Your Profile:</strong> Add your photo, bio, areas of expertise, and client list</li>
            <li><strong>Go Live:</strong> Once approved, your profile will be visible to Texas businesses</li>
            <li><strong>Optional: Upgrade Your Tier:</strong> Consider Premium ($297/mo) or Featured ($597/mo) for increased visibility</li>
          </ol>

          <p style="margin-top: 30px;">
            <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">Get Started</a>
          </p>

          <h3>Need Help?</h3>
          <ul>
            <li>If you're not sure whether you have an existing profile, search for your name on <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists">${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists</a></li>
            <li>Remember: You must be registered with the Texas Ethics Commission to actively lobby</li>
            <li>Questions? Contact us at <a href="mailto:support@texaslobby.org">support@texaslobby.org</a></li>
          </ul>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Welcome to the TexasLobby.org community!
          </p>
        `
      });
      console.log('[Approve Role Upgrade API] Approval email sent to user');
    } catch (emailError) {
      console.error('[Approve Role Upgrade API] Failed to send approval email:', emailError);
      // Don't fail - upgrade was successful
    }

    console.log('[Approve Role Upgrade API] Role upgrade approved successfully');

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/role-upgrades?success=approved' },
    });

  } catch (error: any) {
    console.error('[Approve Role Upgrade API] Unexpected error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/role-upgrades?error=unexpected' },
    });
  }
};
