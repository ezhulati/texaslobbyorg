import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Get form data
    const formData = await request.formData();
    const step = parseInt(formData.get('step') as string);

    if (!step || step < 1 || step > 7) {
      return new Response('Invalid step', { status: 400 });
    }

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

    // Update onboarding step
    const { error: updateError } = await supabase
      .from('lobbyists')
      .update({
        onboarding_step: step,
        onboarding_completed: step === 7, // Mark completed when reaching final step
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating onboarding step:', updateError);
      return new Response('Error updating step', { status: 500 });
    }

    // Redirect to appropriate page based on step
    const stepUrls: Record<number, string> = {
      1: '/onboarding/photo',
      2: '/onboarding/bio',
      3: '/onboarding/contact',
      4: '/onboarding/expertise',
      5: '/onboarding/clients',
      6: '/onboarding/review',
      7: '/dashboard',
    };

    return redirect(stepUrls[step] || '/onboarding');
  } catch (error: any) {
    console.error('Update step error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
