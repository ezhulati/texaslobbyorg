import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Claim Profile API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Claim Profile API] Not authenticated');
      return new Response(JSON.stringify({
        error: 'You must be logged in to claim a profile'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { lobbyistId, verificationDocumentUrl } = await request.json();
    console.log('[Claim Profile API] User:', user.id, 'submitting claim for lobbyist:', lobbyistId);

    if (!lobbyistId) {
      return new Response(JSON.stringify({
        error: 'Lobbyist ID is required'
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

    // Use service role client for database operations
    const serverClient = createServerClient();

    // STEP 1: Fetch the lobbyist profile
    const { data: lobbyist, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('id, email, slug, first_name, last_name, cities, is_claimed')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Claim Profile API] Profile not found:', fetchError);
      return new Response(JSON.stringify({
        error: 'Profile not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: Verify profile is not already claimed
    if (lobbyist.is_claimed) {
      console.error('[Claim Profile API] Profile already claimed');
      return new Response(JSON.stringify({
        error: 'This profile has already been claimed by another user'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 3: Check if user already has a pending claim for this profile
    const { data: existingClaim, error: existingClaimError } = await serverClient
      .from('profile_claim_requests')
      .select('id, status')
      .eq('lobbyist_id', lobbyistId)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (!existingClaimError && existingClaim) {
      console.error('[Claim Profile API] User already has a pending claim for this profile');
      return new Response(JSON.stringify({
        error: 'You already have a pending claim request for this profile. Please wait for admin review.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 4: Check if user already has a claimed profile
    const { data: existingProfile } = await serverClient
      .from('lobbyists')
      .select('id, slug')
      .eq('claimed_by', user.id)
      .single();

    if (existingProfile) {
      console.error('[Claim Profile API] User already has a claimed profile:', existingProfile.id);
      return new Response(JSON.stringify({
        error: 'You already have a claimed profile',
        existingProfileSlug: existingProfile.slug
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 5: Create claim request (NOT directly claiming - requires admin approval)
    const { data: claimRequest, error: claimError } = await serverClient
      .from('profile_claim_requests')
      .insert({
        lobbyist_id: lobbyistId,
        user_id: user.id,
        verification_document_url: verificationDocumentUrl,
        status: 'pending',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (claimError) {
      console.error('[Claim Profile API] Error creating claim request:', claimError);
      return new Response(JSON.stringify({
        error: 'Failed to submit claim request. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Claim Profile API] Claim request created successfully:', claimRequest.id);

    // STEP 6: Send email notification to admin
    try {
      await sendEmail({
        to: 'enrizhulati@gmail.com',
        subject: `New Profile Claim Request - ${lobbyist.first_name} ${lobbyist.last_name}`,
        html: `
          <h2>New Profile Claim Request</h2>
          <p>A user has submitted a claim request for verification.</p>

          <h3>Profile Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${lobbyist.first_name} ${lobbyist.last_name}</li>
            <li><strong>Profile Email:</strong> ${lobbyist.email || 'Not set'}</li>
            <li><strong>Cities:</strong> ${lobbyist.cities?.join(', ') || 'None'}</li>
            <li><strong>Profile URL:</strong> <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${lobbyist.slug}">${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/lobbyists/${lobbyist.slug}</a></li>
          </ul>

          <h3>Claimant Details:</h3>
          <ul>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>User ID:</strong> ${user.id}</li>
            <li><strong>Submitted:</strong> ${new Date().toLocaleString()}</li>
          </ul>

          <h3>Action Required:</h3>
          <p><a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/admin/pending" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">Review Claim Request</a></p>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">Please review and approve/reject this claim within 48 hours.</p>
        `
      });
      console.log('[Claim Profile API] Admin notification email sent');
    } catch (emailError) {
      console.error('[Claim Profile API] Failed to send admin notification email:', emailError);
      // Don't fail the request - claim was created successfully
    }

    console.log('[Claim Profile API] Claim request submitted successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Claim request submitted successfully! Your request will be reviewed within 48 hours.',
      redirectTo: '/dashboard',
      profileSlug: lobbyist.slug
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Claim Profile API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
