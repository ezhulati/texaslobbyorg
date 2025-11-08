import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

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

    const { lobbyistId } = await request.json();
    console.log('[Claim Profile API] User:', user.id, 'claiming lobbyist:', lobbyistId);

    if (!lobbyistId) {
      return new Response(JSON.stringify({
        error: 'Lobbyist ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use service role client for database operations
    const serverClient = createServerClient();

    // STEP 1: Fetch the lobbyist profile to claim
    const { data: lobbyist, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('id, email, slug, is_claimed, user_id')
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

    // STEP 3: Verify user's email matches lobbyist email (security check)
    if (lobbyist.email && lobbyist.email.toLowerCase() !== user.email?.toLowerCase()) {
      console.error('[Claim Profile API] Email mismatch. User:', user.email, 'Profile:', lobbyist.email);
      return new Response(JSON.stringify({
        error: 'Your email does not match the profile email. Please contact support if you believe this is an error.'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 4: Check if user already has a claimed profile
    const { data: existingProfile, error: existingError } = await serverClient
      .from('lobbyists')
      .select('id, slug')
      .eq('user_id', user.id)
      .eq('is_claimed', true)
      .single();

    if (!existingError && existingProfile) {
      console.error('[Claim Profile API] User already has a claimed profile:', existingProfile.id);
      return new Response(JSON.stringify({
        error: 'You already have a claimed profile',
        existingProfileSlug: existingProfile.slug
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 5: Claim the profile
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        user_id: user.id,
        is_claimed: true,
        email: lobbyist.email || user.email, // Set email if not already set
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('[Claim Profile API] Error updating lobbyist profile:', updateError);
      return new Response(JSON.stringify({
        error: 'Failed to claim profile. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // STEP 6: Update user role to 'lobbyist'
    const { error: roleError } = await serverClient
      .from('users')
      .update({ role: 'lobbyist' })
      .eq('id', user.id);

    if (roleError) {
      console.error('[Claim Profile API] Error updating user role:', roleError);
      // Don't fail the request - profile was claimed successfully
    }

    console.log('[Claim Profile API] Profile claimed successfully');

    return new Response(JSON.stringify({
      success: true,
      message: 'Profile claimed successfully!',
      redirectTo: '/onboarding', // Send to onboarding to complete profile
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
