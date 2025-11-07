import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { sendEmail, profileApprovedEmail } from '@/lib/email';

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

    // Get lobbyist profile
    const { data: lobbyist, error: fetchError } = await supabase
      .from('lobbyists')
      .select('*, users!inner(email)')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      return new Response('Profile not found', { status: 404 });
    }

    // Approve profile
    const { error: updateError } = await supabase
      .from('lobbyists')
      .update({
        is_pending: false,
        is_active: true,
        is_verified: true,
        pending_reason: null,
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('Error approving profile:', updateError);
      return new Response('Error approving profile', { status: 500 });
    }

    // Send approval email
    const profileUrl = `${new URL(request.url).origin}/lobbyists/${lobbyist.slug}`;
    const emailTemplate = profileApprovedEmail(
      `${lobbyist.first_name} ${lobbyist.last_name}`,
      profileUrl
    );

    await sendEmail({
      to: lobbyist.users.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    return redirect('/admin/pending?success=approved');
  } catch (error: any) {
    console.error('Approve profile error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
