import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Approve Merge API] POST request received');

    // Get authenticated user and verify admin role
    const authClient = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      console.error('[Approve Merge API] Not authenticated');
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
      console.error('[Approve Merge API] User is not an admin');
      return new Response(null, {
        status: 302,
        headers: { Location: '/dashboard' },
      });
    }

    // Get merge_id from form data
    const formData = await request.formData();
    const mergeId = formData.get('merge_id');

    if (!mergeId) {
      return new Response('Merge ID is required', {
        status: 400,
      });
    }

    console.log('[Approve Merge API] Approving merge:', mergeId);

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
        )
      `)
      .eq('id', mergeId)
      .single();

    if (fetchError || !mergeRequest) {
      console.error('[Approve Merge API] Merge request not found:', fetchError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/merge-requests?error=not_found' },
      });
    }

    if (mergeRequest.status !== 'pending') {
      console.error('[Approve Merge API] Merge request is not pending');
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/merge-requests?error=not_pending' },
      });
    }

    // Fetch both profiles
    const { data: primaryProfile } = await serverClient
      .from('lobbyists')
      .select('*')
      .eq('id', mergeRequest.primary_lobbyist_id)
      .single();

    const { data: duplicateProfile } = await serverClient
      .from('lobbyists')
      .select('*')
      .eq('id', mergeRequest.duplicate_lobbyist_id)
      .single();

    if (!primaryProfile || !duplicateProfile) {
      console.error('[Approve Merge API] One or both profiles not found');
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/merge-requests?error=profiles_not_found' },
      });
    }

    // STEP 1: Determine the best subscription tier (keep the higher one)
    const tierHierarchy: { [key: string]: number } = {
      'free': 0,
      'premium': 1,
      'featured': 2
    };

    const finalTier = tierHierarchy[primaryProfile.subscription_tier] >= tierHierarchy[duplicateProfile.subscription_tier]
      ? primaryProfile.subscription_tier
      : duplicateProfile.subscription_tier;

    // STEP 2: Calculate combined view count
    const combinedViewCount = (primaryProfile.view_count || 0) + (duplicateProfile.view_count || 0);

    // STEP 3: Merge cities and subject_areas (combine and deduplicate)
    const combinedCities = Array.from(new Set([
      ...(primaryProfile.cities || []),
      ...(duplicateProfile.cities || [])
    ]));

    const combinedSubjectAreas = Array.from(new Set([
      ...(primaryProfile.subject_areas || []),
      ...(duplicateProfile.subject_areas || [])
    ]));

    // STEP 4: Keep the better bio (longer one)
    const finalBio = (duplicateProfile.bio?.length || 0) > (primaryProfile.bio?.length || 0)
      ? duplicateProfile.bio
      : primaryProfile.bio;

    // STEP 5: Update the primary profile with merged data
    const { error: updatePrimaryError } = await serverClient
      .from('lobbyists')
      .update({
        subscription_tier: finalTier,
        view_count: combinedViewCount,
        cities: combinedCities,
        subject_areas: combinedSubjectAreas,
        bio: finalBio,
        // Keep photo from duplicate if primary doesn't have one
        photo_url: primaryProfile.photo_url || duplicateProfile.photo_url,
        // Keep contact info from duplicate if primary doesn't have it
        phone: primaryProfile.phone || duplicateProfile.phone,
        website: primaryProfile.website || duplicateProfile.website,
        updated_at: new Date().toISOString()
      })
      .eq('id', mergeRequest.primary_lobbyist_id);

    if (updatePrimaryError) {
      console.error('[Approve Merge API] Error updating primary profile:', updatePrimaryError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/admin/merge-requests?error=update_failed' },
      });
    }

    // STEP 6: Transfer favorites from duplicate to primary
    const { data: favoritesToTransfer } = await serverClient
      .from('favorites')
      .select('user_id')
      .eq('lobbyist_id', mergeRequest.duplicate_lobbyist_id);

    if (favoritesToTransfer && favoritesToTransfer.length > 0) {
      // Delete duplicate favorites first (to avoid conflicts)
      await serverClient
        .from('favorites')
        .delete()
        .eq('lobbyist_id', mergeRequest.duplicate_lobbyist_id);

      // Insert favorites for primary profile (skip if already exists)
      const favoritesInserts = favoritesToTransfer.map((fav: any) => ({
        user_id: fav.user_id,
        lobbyist_id: mergeRequest.primary_lobbyist_id
      }));

      // Use upsert to handle duplicates gracefully
      await serverClient
        .from('favorites')
        .upsert(favoritesInserts, {
          onConflict: 'user_id,lobbyist_id',
          ignoreDuplicates: true
        });
    }

    // STEP 7: Transfer clients from duplicate to primary
    const { data: clientsToTransfer } = await serverClient
      .from('clients')
      .select('*')
      .eq('lobbyist_id', mergeRequest.duplicate_lobbyist_id);

    if (clientsToTransfer && clientsToTransfer.length > 0) {
      // Update client relationships to point to primary profile
      await serverClient
        .from('clients')
        .update({ lobbyist_id: mergeRequest.primary_lobbyist_id })
        .eq('lobbyist_id', mergeRequest.duplicate_lobbyist_id);
    }

    // STEP 8: Soft delete the duplicate profile
    const { error: deleteDuplicateError } = await serverClient
      .from('lobbyists')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        is_claimed: false,
        user_id: null,
        claimed_by: null
      })
      .eq('id', mergeRequest.duplicate_lobbyist_id);

    if (deleteDuplicateError) {
      console.error('[Approve Merge API] Error soft-deleting duplicate:', deleteDuplicateError);
      // Continue - primary profile was updated successfully
    }

    // STEP 9: Update the merge request to approved
    const { error: updateMergeError } = await serverClient
      .from('account_merge_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', mergeId);

    if (updateMergeError) {
      console.error('[Approve Merge API] Error updating merge request:', updateMergeError);
      // Continue - merge was successful
    }

    // STEP 10: Delete the verification document
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
      console.error('[Approve Merge API] Error deleting verification document:', deleteError);
      // Continue - document deletion is not critical
    }

    // STEP 11: Send approval email to user
    try {
      await sendEmail({
        to: mergeRequest.users.email,
        subject: 'Account Merge Approved',
        html: `
          <h2>Your Account Merge Request Has Been Approved!</h2>
          <p>Great news! Your profiles have been successfully merged.</p>

          <h3>Merge Summary:</h3>
          <ul>
            <li><strong>Primary Profile:</strong> ${primaryProfile.first_name} ${primaryProfile.last_name}</li>
            <li><strong>Merged Profile:</strong> ${duplicateProfile.first_name} ${duplicateProfile.last_name} (now hidden)</li>
            <li><strong>Final Subscription Tier:</strong> ${finalTier.toUpperCase()}</li>
            <li><strong>Total Profile Views:</strong> ${combinedViewCount}</li>
          </ul>

          <h3>What Happened:</h3>
          <ul>
            <li>All data from both profiles has been combined into your primary profile</li>
            <li>Your favorites and client relationships have been preserved</li>
            <li>The duplicate profile has been hidden from public view</li>
            <li>You now have a single, unified profile</li>
          </ul>

          <p style="margin-top: 30px;">
            <a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">View Your Profile</a>
          </p>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            If you have any questions, please contact us at <a href="mailto:support@texaslobby.org">support@texaslobby.org</a>
          </p>
        `
      });
      console.log('[Approve Merge API] Approval email sent to user');
    } catch (emailError) {
      console.error('[Approve Merge API] Failed to send approval email:', emailError);
      // Don't fail - merge was successful
    }

    console.log('[Approve Merge API] Merge approved successfully');

    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/merge-requests?success=approved' },
    });

  } catch (error: any) {
    console.error('[Approve Merge API] Unexpected error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/admin/merge-requests?error=unexpected' },
    });
  }
};
