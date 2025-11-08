import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Request Merge API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Request Merge API] Not authenticated');
      return new Response(JSON.stringify({
        error: 'You must be logged in to submit a merge request'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { primaryProfileId, duplicateProfileId, verificationDocumentUrl } = await request.json();
    console.log('[Request Merge API] User:', user.id, 'requesting merge:', primaryProfileId, duplicateProfileId);

    // Validation
    if (!primaryProfileId || !duplicateProfileId) {
      return new Response(JSON.stringify({
        error: 'Both primary and duplicate profile IDs are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (primaryProfileId === duplicateProfileId) {
      return new Response(JSON.stringify({
        error: 'Cannot merge a profile with itself'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!verificationDocumentUrl) {
      return new Response(JSON.stringify({
        error: 'ID verification document is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use server client for database operations
    const serverClient = createServerClient();

    // STEP 1: Fetch both profiles to verify they exist
    const { data: primaryProfile, error: primaryError } = await serverClient
      .from('lobbyists')
      .select('id, first_name, last_name, email, slug, claimed_by')
      .eq('id', primaryProfileId)
      .single();

    const { data: duplicateProfile, error: duplicateError } = await serverClient
      .from('lobbyists')
      .select('id, first_name, last_name, email, slug, claimed_by')
      .eq('id', duplicateProfileId)
      .single();

    if (primaryError || !primaryProfile || duplicateError || !duplicateProfile) {
      console.error('[Request Merge API] One or both profiles not found');
      return new Response(JSON.stringify({
        error: 'One or both profiles not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: Verify user has claim to at least one of the profiles
    const userHasClaim = (
      primaryProfile.claimed_by === user.id ||
      duplicateProfile.claimed_by === user.id ||
      primaryProfile.email?.toLowerCase() === user.email?.toLowerCase() ||
      duplicateProfile.email?.toLowerCase() === user.email?.toLowerCase()
    );

    if (!userHasClaim) {
      console.error('[Request Merge API] User does not have claim to either profile');
      return new Response(JSON.stringify({
        error: 'You must own at least one of the profiles to request a merge'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 3: Check for existing pending merge request
    const { data: existingMerge } = await serverClient
      .from('account_merge_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingMerge) {
      console.error('[Request Merge API] User already has a pending merge request');
      return new Response(JSON.stringify({
        error: 'You already have a pending merge request. Please wait for it to be reviewed.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 4: Create merge request
    const { data: mergeRequest, error: mergeError } = await serverClient
      .from('account_merge_requests')
      .insert({
        primary_lobbyist_id: primaryProfileId,
        duplicate_lobbyist_id: duplicateProfileId,
        user_id: user.id,
        verification_document_url: verificationDocumentUrl,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (mergeError) {
      console.error('[Request Merge API] Error creating merge request:', mergeError);
      return new Response(JSON.stringify({
        error: 'Failed to create merge request. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Request Merge API] Merge request created:', mergeRequest.id);

    // STEP 5: Send email notification to admin
    try {
      await sendEmail({
        to: 'enrizhulati@gmail.com',
        subject: `New Account Merge Request - ${primaryProfile.first_name} ${primaryProfile.last_name}`,
        html: `
          <h2>New Account Merge Request</h2>
          <p>A user has submitted a request to merge duplicate lobbyist profiles.</p>

          <h3>Primary Profile (Keep):</h3>
          <ul>
            <li><strong>Name:</strong> ${primaryProfile.first_name} ${primaryProfile.last_name}</li>
            <li><strong>Email:</strong> ${primaryProfile.email || 'Not set'}</li>
            <li><strong>Claimed By:</strong> ${primaryProfile.claimed_by || 'Unclaimed'}</li>
            <li><strong>Profile URL:</strong> <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${primaryProfile.slug}">${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${primaryProfile.slug}</a></li>
          </ul>

          <h3>Duplicate Profile (Will Be Merged):</h3>
          <ul>
            <li><strong>Name:</strong> ${duplicateProfile.first_name} ${duplicateProfile.last_name}</li>
            <li><strong>Email:</strong> ${duplicateProfile.email || 'Not set'}</li>
            <li><strong>Claimed By:</strong> ${duplicateProfile.claimed_by || 'Unclaimed'}</li>
            <li><strong>Profile URL:</strong> <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${duplicateProfile.slug}">${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${duplicateProfile.slug}</a></li>
          </ul>

          <h3>Requester Details:</h3>
          <ul>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>User ID:</strong> ${user.id}</li>
            <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
          </ul>

          <h3>Action Required:</h3>
          <p><a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/admin/merge-requests" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">Review Merge Request</a></p>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">Please review and approve/reject this merge request within 48 hours.</p>
        `
      });
      console.log('[Request Merge API] Admin notification email sent');
    } catch (emailError) {
      console.error('[Request Merge API] Failed to send admin notification email:', emailError);
      // Don't fail the request - merge request was created successfully
    }

    console.log('[Request Merge API] Merge request submitted successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Merge request submitted successfully! Your request will be reviewed within 48 hours.',
      mergeRequestId: mergeRequest.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Request Merge API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
