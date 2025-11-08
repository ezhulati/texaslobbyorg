import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Approve Claim API] POST request received');

    // Get authenticated user and verify admin role
    const authClient = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error('[Approve Claim API] Not authenticated');
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
      console.error('[Approve Claim API] User is not an admin');
      return new Response(null, {
        status: 302,
        headers: { Location: '/dashboard' },
      });
    }

    // Get claim_id from form data
    const formData = await request.formData();
    const claimId = formData.get('claim_id');

    if (!claimId) {
      return new Response('Claim ID is required', {
        status: 400,
      });
    }

    console.log('[Approve Claim API] Approving claim:', claimId);

    // Fetch the claim request with related data
    const { data: claimRequest, error: fetchError } = await serverClient
      .from('profile_claim_requests')
      .select(`
        id,
        lobbyist_id,
        user_id,
        verification_document_url,
        status,
        lobbyists!inner (
          id,
          first_name,
          last_name,
          email,
          slug
        ),
        users!inner (
          email,
          full_name
        )
      `)
      .eq('id', claimId)
      .single();

    if (fetchError || !claimRequest) {
      console.error('[Approve Claim API] Claim not found:', fetchError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/pending?error=claim_not_found' },
      });
    }

    if (claimRequest.status !== 'pending') {
      console.error('[Approve Claim API] Claim is not pending');
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/pending?error=claim_not_pending' },
      });
    }

    const lobbyist = claimRequest.lobbyists;
    const claimant = claimRequest.users;

    // STEP 1: Update the claim request to approved
    const { error: updateClaimError } = await serverClient
      .from('profile_claim_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', claimId);

    if (updateClaimError) {
      console.error('[Approve Claim API] Error updating claim request:', updateClaimError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/pending?error=update_failed' },
      });
    }

    // STEP 2: Update the lobbyist profile - link to user and mark as claimed
    const { error: updateLobbyistError } = await serverClient
      .from('lobbyists')
      .update({
        claimed_by: claimRequest.user_id,
        claimed_at: new Date().toISOString(),
        is_claimed: true,
        user_id: claimRequest.user_id,
        email: lobbyist.email || claimant.email
      })
      .eq('id', claimRequest.lobbyist_id);

    if (updateLobbyistError) {
      console.error('[Approve Claim API] Error updating lobbyist:', updateLobbyistError);
      // Rollback claim approval
      await serverClient
        .from('profile_claim_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null })
        .eq('id', claimId);

      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/pending?error=update_failed' },
      });
    }

    // STEP 3: Update user role to lobbyist
    const { error: roleError } = await serverClient
      .from('users')
      .update({ role: 'lobbyist' })
      .eq('id', claimRequest.user_id);

    if (roleError) {
      console.error('[Approve Claim API] Error updating user role:', roleError);
      // Don't fail - profile was claimed successfully
    }

    // STEP 4: Delete the verification document (no longer needed)
    try {
      if (claimRequest.verification_document_url) {
        const fileName = claimRequest.verification_document_url.split('/').pop();
        if (fileName) {
          await serverClient.storage
            .from('id-verifications')
            .remove([`${claimRequest.user_id}/${fileName}`]);
        }
      }
    } catch (deleteError) {
      console.error('[Approve Claim API] Error deleting verification document:', deleteError);
      // Don't fail - document deletion is not critical
    }

    // STEP 5: Send approval email to claimant
    try {
      await sendEmail({
        to: claimant.email,
        subject: `Profile Claim Approved - ${lobbyist.first_name} ${lobbyist.last_name}`,
        html: `
          <h2>Your Profile Claim Has Been Approved!</h2>
          <p>Great news! Your claim request for the lobbyist profile has been approved.</p>

          <h3>Profile Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${lobbyist.first_name} ${lobbyist.last_name}</li>
            <li><strong>Profile URL:</strong> <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${lobbyist.slug}">${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${lobbyist.slug}</a></li>
          </ul>

          <h3>What's Next?</h3>
          <ol>
            <li>Log in to your account and complete your profile in the dashboard</li>
            <li>Add a professional photo and compelling bio</li>
            <li>List your areas of expertise and past clients</li>
            <li>Consider upgrading to a Premium or Featured tier for increased visibility</li>
          </ol>

          <p style="margin-top: 30px;">
            <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">Go to Dashboard</a>
          </p>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">Welcome to TexasLobby.org!</p>
        `
      });
      console.log('[Approve Claim API] Approval email sent to claimant');
    } catch (emailError) {
      console.error('[Approve Claim API] Failed to send approval email:', emailError);
      // Don't fail - claim was approved successfully
    }

    console.log('[Approve Claim API] Claim approved successfully');

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/pending?success=approved' },
    });

  } catch (error: any) {
    console.error('[Approve Claim API] Unexpected error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/pending?error=unexpected' },
    });
  }
};
