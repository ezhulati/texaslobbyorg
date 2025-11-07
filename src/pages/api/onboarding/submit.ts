import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  try {
    // Get session from cookies
    const accessToken = cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      return redirect('/login');
    }

    // Get user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return redirect('/login');
    }

    // Get lobbyist profile
    const { data: lobbyistProfile, error: profileError } = await supabase
      .from('lobbyists')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !lobbyistProfile) {
      console.error('Error fetching lobbyist profile:', profileError);
      return new Response('Profile not found', { status: 404 });
    }

    // Validate requirements
    const hasRequiredBio = lobbyistProfile.bio && lobbyistProfile.bio.length >= 100;

    // Check for clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('lobbyist_id', lobbyistProfile.id);

    const hasClients = clients && clients.length > 0;

    if (!hasRequiredBio || !hasClients) {
      return new Response('Profile incomplete', { status: 400 });
    }

    // Update profile to pending status
    const { error: updateError } = await supabase
      .from('lobbyists')
      .update({
        onboarding_completed: true,
        onboarding_step: 7,
        is_pending: true,
        is_active: false, // Not active until admin approves
        pending_reason: 'New lobbyist onboarding submission - awaiting admin review',
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return new Response('Error submitting profile', { status: 500 });
    }

    // TODO: Send email notification to admin
    // TODO: Send confirmation email to user

    // Redirect to success page
    return redirect('/onboarding/success');
  } catch (error: any) {
    console.error('Submit error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
