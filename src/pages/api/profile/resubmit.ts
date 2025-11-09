import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Resubmit Profile API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Resubmit Profile API] Not authenticated');
      return new Response(JSON.stringify({
        error: 'You must be logged in to resubmit a profile'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { lobbyistId, formData } = await request.json();
    console.log('[Resubmit Profile API] User:', user.id, 'resubmitting profile:', lobbyistId);

    // Validate required fields
    if (!lobbyistId || !formData) {
      return new Response(JSON.stringify({
        error: 'Missing required data'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!formData.firstName || !formData.lastName || !formData.email) {
      return new Response(JSON.stringify({
        error: 'First name, last name, and email are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use service role client for database operations
    const serverClient = createServerClient();

    // STEP 1: Get existing profile and verify ownership
    const { data: existingProfile, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('*')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !existingProfile) {
      console.error('[Resubmit Profile API] Profile not found:', lobbyistId);
      return new Response(JSON.stringify({
        error: 'Profile not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership
    const isOwner = existingProfile.user_id === user.id || existingProfile.claimed_by === user.id;
    if (!isOwner) {
      console.error('[Resubmit Profile API] User does not own this profile');
      return new Response(JSON.stringify({
        error: 'You do not have permission to modify this profile'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 2: Verify profile is actually rejected
    if (!existingProfile.is_rejected) {
      console.error('[Resubmit Profile API] Profile is not rejected');
      return new Response(JSON.stringify({
        error: 'This profile is not rejected and cannot be resubmitted'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 3: Check max attempts (using database helper function)
    const { data: canResubmit, error: canResubmitError } = await serverClient.rpc('can_user_resubmit', {
      lobbyist_uuid: lobbyistId
    });

    if (canResubmitError) {
      console.error('[Resubmit Profile API] Error checking resubmit eligibility:', canResubmitError);
      return new Response(JSON.stringify({
        error: 'Error checking resubmission eligibility'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!canResubmit) {
      console.error('[Resubmit Profile API] Max resubmission attempts reached');
      return new Response(JSON.stringify({
        error: 'Maximum resubmission attempts reached (3 attempts). Please contact support.',
        maxAttemptsReached: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 4: Check cooldown period (using database helper function)
    const { data: cooldownElapsed, error: cooldownError } = await serverClient.rpc('is_resubmission_cooldown_elapsed', {
      lobbyist_uuid: lobbyistId
    });

    if (cooldownError) {
      console.error('[Resubmit Profile API] Error checking cooldown:', cooldownError);
      return new Response(JSON.stringify({
        error: 'Error checking cooldown period'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!cooldownElapsed) {
      console.error('[Resubmit Profile API] Cooldown period not elapsed');
      return new Response(JSON.stringify({
        error: 'Please wait 24 hours between resubmissions',
        cooldownActive: true
      }), {
        status: 429, // Too Many Requests
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 5: Check for meaningful changes (anti-spam)
    const hasChanges = (
      existingProfile.first_name !== formData.firstName ||
      existingProfile.last_name !== formData.lastName ||
      existingProfile.email !== formData.email ||
      existingProfile.phone !== (formData.phone || null) ||
      existingProfile.website !== (formData.website || null) ||
      existingProfile.linkedin_url !== (formData.linkedinUrl || null) ||
      existingProfile.bio !== (formData.bio || null) ||
      existingProfile.id_verification_url !== (formData.idVerificationUrl || null) ||
      JSON.stringify(existingProfile.cities || []) !== JSON.stringify(
        formData.cities ? formData.cities.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0) : []
      ) ||
      JSON.stringify(existingProfile.subject_areas || []) !== JSON.stringify(
        formData.subjectAreas ? formData.subjectAreas.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0) : []
      )
    );

    if (!hasChanges) {
      console.error('[Resubmit Profile API] No changes detected');
      return new Response(JSON.stringify({
        error: 'Please make at least one change to your profile before resubmitting',
        noChanges: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 6: Parse cities and subject areas
    const cities = formData.cities
      ? formData.cities
          .split(',')
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0)
      : [];

    const subjectAreas = formData.subjectAreas
      ? formData.subjectAreas
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : [];

    // STEP 7: Update profile with new data and reset rejection status
    const { data: updatedProfile, error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        website: formData.website || null,
        linkedin_url: formData.linkedinUrl || null,
        bio: formData.bio || null,
        cities: cities.length > 0 ? cities : [],
        subject_areas: subjectAreas.length > 0 ? subjectAreas : [],
        id_verification_url: formData.idVerificationUrl || null,
        // Reset rejection status
        is_rejected: false,
        is_pending: true,
        is_active: false,
        pending_reason: `Resubmission (Attempt ${existingProfile.rejection_count + 1} of 3) - Awaiting review`,
        // Update timestamps
        last_resubmission_at: new Date().toISOString(),
        // Keep rejection_count and other rejection metadata for audit trail
      })
      .eq('id', lobbyistId)
      .select('id, slug')
      .single();

    if (updateError) {
      console.error('[Resubmit Profile API] Error updating profile:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to resubmit profile. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Resubmit Profile API] Profile resubmitted successfully:', updatedProfile.id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Profile resubmitted successfully! Your profile is pending admin review.',
      profileSlug: updatedProfile.slug
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Resubmit Profile API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: error?.message || 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
