import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email/resend';

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    console.log('[Request Role Upgrade API] POST request received');

    // Get authenticated user
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Request Role Upgrade API] Not authenticated');
      return new Response(null, {
        status: 302,
        headers: { Location: '/login' },
      });
    }

    // Get form data
    const formData = await request.formData();
    const reason = formData.get('reason')?.toString().trim();
    const currentFirm = formData.get('current_firm')?.toString().trim() || null;
    const yearsExperience = formData.get('years_experience')?.toString() || null;
    const tecRegistration = formData.get('tec_registration')?.toString();

    // Validation
    if (!reason || reason.length < 50) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/become-lobbyist?error=reason_too_short' },
      });
    }

    if (!tecRegistration) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/become-lobbyist?error=tec_registration_required' },
      });
    }

    // Use server client for database operations
    const serverClient = createServerClient();

    // Get user's current role
    const { data: userData } = await serverClient
      .from('users')
      .select('role, email, full_name')
      .eq('id', user.id)
      .single();

    if (!userData) {
      console.error('[Request Role Upgrade API] User not found');
      return new Response(null, {
        status: 302,
        headers: { Location: '/become-lobbyist?error=user_not_found' },
      });
    }

    // Check if already a lobbyist
    if (userData.role === 'lobbyist') {
      console.error('[Request Role Upgrade API] User is already a lobbyist');
      return new Response(null, {
        status: 302,
        headers: { Location: '/dashboard?message=already_lobbyist' },
      });
    }

    // Check for existing pending request
    const { data: existingRequest } = await serverClient
      .from('role_upgrade_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      console.error('[Request Role Upgrade API] User already has a pending request');
      return new Response(null, {
        status: 302,
        headers: { Location: '/become-lobbyist?error=already_pending' },
      });
    }

    // Build additional info JSON
    const additionalInfo: any = {
      current_firm: currentFirm,
      years_experience: yearsExperience ? parseInt(yearsExperience) : null,
      tec_registration: tecRegistration
    };

    // Create role upgrade request
    const { data: upgradeRequest, error: createError } = await serverClient
      .from('role_upgrade_requests')
      .insert({
        user_id: user.id,
        from_role: userData.role,
        to_role: 'lobbyist',
        reason: reason,
        status: 'pending',
        submitted_at: new Date().toISOString(),
        admin_notes: JSON.stringify(additionalInfo)
      })
      .select()
      .single();

    if (createError) {
      console.error('[Request Role Upgrade API] Error creating request:', createError);
      return new Response(null, {
        status: 302,
        headers: { Location: '/become-lobbyist?error=create_failed' },
      });
    }

    console.log('[Request Role Upgrade API] Role upgrade request created:', upgradeRequest.id);

    // Send email notification to admin
    try {
      await sendEmail({
        to: 'enrizhulati@gmail.com',
        subject: `New Role Upgrade Request - ${userData.full_name || user.email}`,
        html: `
          <h2>New Role Upgrade Request</h2>
          <p>A user has requested to upgrade their account from searcher to lobbyist.</p>

          <h3>User Details:</h3>
          <ul>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Name:</strong> ${userData.full_name || 'Not provided'}</li>
            <li><strong>Current Role:</strong> ${userData.role}</li>
            <li><strong>User ID:</strong> ${user.id}</li>
          </ul>

          <h3>Request Details:</h3>
          <ul>
            <li><strong>Reason:</strong></li>
          </ul>
          <div style="background-color: #f3f4f6; border-left: 4px solid #003f87; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${reason}</p>
          </div>

          ${currentFirm ? `<ul><li><strong>Current Firm:</strong> ${currentFirm}</li></ul>` : ''}
          ${yearsExperience ? `<ul><li><strong>Years of Experience:</strong> ${yearsExperience}</li></ul>` : ''}
          <ul><li><strong>TEC Registration Status:</strong> ${tecRegistration}</li></ul>

          <h3>Action Required:</h3>
          <p><a href="${process.env.PUBLIC_SITE_URL || 'https://texaslobby.org'}/admin/role-upgrades" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 6px;">Review Role Upgrade Request</a></p>

          <p style="margin-top: 20px; color: #666; font-size: 14px;">Please review and approve/reject this request within 24-48 hours.</p>
        `
      });
      console.log('[Request Role Upgrade API] Admin notification email sent');
    } catch (emailError) {
      console.error('[Request Role Upgrade API] Failed to send admin notification email:', emailError);
      // Don't fail the request - upgrade request was created successfully
    }

    console.log('[Request Role Upgrade API] Role upgrade request submitted successfully');

    return new Response(null, {
      status: 302,
      headers: { Location: '/become-lobbyist?success=submitted' },
    });

  } catch (error: any) {
    console.error('[Request Role Upgrade API] Unexpected error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/become-lobbyist?error=unexpected' },
    });
  }
};
