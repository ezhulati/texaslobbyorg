import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Reject Claim API] POST request received');

    // Get authenticated user and verify admin role
    const authClient = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error('[Reject Claim API] Not authenticated');
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
      console.error('[Reject Claim API] User is not an admin');
      return new Response(null, {
        status: 302,
        headers: { Location: '/dashboard' },
      });
    }

    // Get claim_id and optional reason from form data
    const formData = await request.formData();
    const claimId = formData.get('claim_id');
    const rejectionReason = formData.get('rejection_reason') || 'Your claim could not be verified. Please contact support if you believe this is an error.';

    if (!claimId) {
      return new Response('Claim ID is required', {
        status: 400,
      });
    }

    console.log('[Reject Claim API] Rejecting claim:', claimId);

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
      console.error('[Reject Claim API] Claim not found:', fetchError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/pending?error=claim_not_found' },
      });
    }

    if (claimRequest.status !== 'pending') {
      console.error('[Reject Claim API] Claim is not pending');
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/pending?error=claim_not_pending' },
      });
    }

    const lobbyist = claimRequest.lobbyists;
    const claimant = claimRequest.users;

    // STEP 1: Update the claim request to rejected
    const { error: updateClaimError } = await serverClient
      .from('profile_claim_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason as string,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', claimId);

    if (updateClaimError) {
      console.error('[Reject Claim API] Error updating claim request:', updateClaimError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/pending?error=update_failed' },
      });
    }

    // STEP 2: Delete the verification document
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
      console.error('[Reject Claim API] Error deleting verification document:', deleteError);
      // Don't fail - document deletion is not critical
    }

    // STEP 3: Send rejection email to claimant
    try {
      await sendEmail({
        to: claimant.email,
        subject: `Profile Claim Request - Action Required`,
        html: `
          <h2>Profile Claim Request Status</h2>
          <p>We've reviewed your claim request for the following profile:</p>

          <h3>Profile Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${lobbyist.first_name} ${lobbyist.last_name}</li>
            <li><strong>Profile URL:</strong> <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${lobbyist.slug}">${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${lobbyist.slug}</a></li>
          </ul>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d;">${rejectionReason}</p>
          </div>

          <h3>What You Can Do:</h3>
          <ol>
            <li>If you believe this is an error, please contact us at <a href="mailto:support@texaslobby.org">support@texaslobby.org</a></li>
            <li>Provide additional documentation if requested</li>
            <li>If your email doesn't match the profile email, we may need additional verification</li>
          </ol>

          <p style="margin-top: 30px;">
            <a href="mailto:support@texaslobby.org" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">Contact Support</a>
          </p>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            If you have any questions, please don't hesitate to reach out to our support team.
          </p>
        `
      });
      console.log('[Reject Claim API] Rejection email sent to claimant');
    } catch (emailError) {
      console.error('[Reject Claim API] Failed to send rejection email:', emailError);
      // Don't fail - claim was rejected successfully
    }

    console.log('[Reject Claim API] Claim rejected successfully');

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/pending?success=rejected' },
    });

  } catch (error: any) {
    console.error('[Reject Claim API] Unexpected error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/pending?error=unexpected' },
    });
  }
};
