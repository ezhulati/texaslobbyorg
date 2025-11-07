import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Verify admin
    const accessToken = cookies.get('sb-access-token')?.value;
    if (!accessToken) {
      return redirect('/login');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return redirect('/login');
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return new Response('Unauthorized', { status: 403 });
    }

    // Get form data
    const formData = await request.formData();
    const lobbyistId = formData.get('lobbyist_id') as string;

    if (!lobbyistId) {
      return new Response('Missing lobbyist ID', { status: 400 });
    }

    // Reject profile (mark as not pending, not active)
    const { error: updateError } = await supabase
      .from('lobbyists')
      .update({
        is_pending: false,
        is_active: false,
        is_verified: false,
        pending_reason: 'Profile rejected by admin',
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('Error rejecting profile:', updateError);
      return new Response('Error rejecting profile', { status: 500 });
    }

    // TODO: Send rejection email with reason

    return redirect('/admin/pending?success=rejected');
  } catch (error: any) {
    console.error('Reject profile error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
