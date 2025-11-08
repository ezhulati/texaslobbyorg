import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Reject Merge API] POST request received');

    // Get authenticated user and verify admin role
    const authClient = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error('[Reject Merge API] Not authenticated');
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
      console.error('[Reject Merge API] User is not an admin');
      return new Response(null, {
        status: 302,
        headers: { Location: '/dashboard' },
      });
    }

    // Get merge_id and optional rejection reason from form data
    const formData = await request.formData();
    const mergeId = formData.get('merge_id');
    const rejectionReason = formData.get('rejection_reason') || 'The account merge request could not be verified. Please contact support if you believe this is an error.';

    if (!mergeId) {
      return new Response('Merge ID is required', {
        status: 400,
      });
    }

    console.log('[Reject Merge API] Rejecting merge:', mergeId);

    // Fetch the merge request with related data
    const { data: mergeRequest, error: fetchError } = await serverClient
      .from('account_merge_requests')
      .select(`
        id,
        primary_lobbyist_id,
        duplicate_lobbyist_id,
        user_id,
        verification_document_url,
        status,
        users!inner (
          email,
          full_name
        ),
        primary_lobbyist:primary_lobbyist_id (
          first_name,
          last_name,
          slug
        ),
        duplicate_lobbyist:duplicate_lobbyist_id (
          first_name,
          last_name,
          slug
        )
      `)
      .eq('id', mergeId)
      .single();

    if (fetchError || !mergeRequest) {
      console.error('[Reject Merge API] Merge request not found:', fetchError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/merge-requests?error=not_found' },
      });
    }

    if (mergeRequest.status !== 'pending') {
      console.error('[Reject Merge API] Merge request is not pending');
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/merge-requests?error=not_pending' },
      });
    }

    // STEP 1: Update the merge request to rejected
    const { error: updateMergeError } = await serverClient
      .from('account_merge_requests')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason as string,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', mergeId);

    if (updateMergeError) {
      console.error('[Reject Merge API] Error updating merge request:', updateMergeError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/merge-requests?error=update_failed' },
      });
    }

    // STEP 2: Delete the verification document
    try {
      if (mergeRequest.verification_document_url) {
        const fileName = mergeRequest.verification_document_url.split('/').pop();
        if (fileName) {
          await serverClient.storage
            .from('id-verifications')
            .remove([`${mergeRequest.user_id}/${fileName}`]);
        }
      }
    } catch (deleteError) {
      console.error('[Reject Merge API] Error deleting verification document:', deleteError);
      // Continue - document deletion is not critical
    }

    // STEP 3: Send rejection email to user
    try {
      await sendEmail({
        to: mergeRequest.users.email,
        subject: 'Account Merge Request - Action Required',
        html: `
          <h2>Account Merge Request Status</h2>
          <p>We've reviewed your request to merge the following profiles:</p>

          <h3>Profiles:</h3>
          <ul>
            <li><strong>Primary:</strong> ${mergeRequest.primary_lobbyist?.first_name} ${mergeRequest.primary_lobbyist?.last_name}</li>
            <li><strong>Duplicate:</strong> ${mergeRequest.duplicate_lobbyist?.first_name} ${mergeRequest.duplicate_lobbyist?.last_name}</li>
          </ul>

          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Status: Not Approved</strong></p>
            <p style="margin: 8px 0 0 0; color: #7f1d1d;">${rejectionReason}</p>
          </div>

          <h3>What You Can Do:</h3>
          <ol>
            <li>If you believe this is an error, please contact us at <a href="mailto:support@texaslobby.org">support@texaslobby.org</a></li>
            <li>Provide additional documentation if requested</li>
            <li>If the profiles don't actually belong to the same person, you may need to manage them separately</li>
          </ol>

          <p style="margin-top: 30px;">
            <a href="mailto:support@texaslobby.org" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">Contact Support</a>
          </p>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            If you have any questions, please don't hesitate to reach out to our support team.
          </p>
        `
      });
      console.log('[Reject Merge API] Rejection email sent to user');
    } catch (emailError) {
      console.error('[Reject Merge API] Failed to send rejection email:', emailError);
      // Don't fail - rejection was successful
    }

    console.log('[Reject Merge API] Merge rejected successfully');

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/merge-requests?success=rejected' },
    });

  } catch (error: any) {
    console.error('[Reject Merge API] Unexpected error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/merge-requests?error=unexpected' },
    });
  }
};
