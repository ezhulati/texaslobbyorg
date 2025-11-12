import type { APIRoute } from 'astro';
import { createServerAuthClient, createServerClient } from '@/lib/supabase';

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    // Get authenticated user using cookies
    const supabase = createServerAuthClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[Reject Profile API] Not authenticated:', authError);
      return new Response(JSON.stringify({
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role using service client
    const serverClient = createServerClient();
    const { data: userData } = await serverClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      console.error('[Reject Profile API] User is not admin');
      return new Response(JSON.stringify({
        error: 'Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse request body (JSON from modal)
    const body = await request.json();
    const {
      lobbyistId,
      category,
      userMessage,
      adminNotes,
      sendEmail = true
    } = body;

    if (!lobbyistId || !category || !userMessage) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: lobbyistId, category, userMessage'
      }), { status: 400 });
    }

    console.log('[Reject Profile API] Rejecting profile:', lobbyistId);
    console.log('[Reject Profile API] Category:', category);

    // Get lobbyist details for email
    const { data: lobbyist, error: fetchError } = await serverClient
      .from('lobbyists')
      .select('first_name, last_name, email, user_id, is_active, rejection_count')
      .eq('id', lobbyistId)
      .single();

    if (fetchError || !lobbyist) {
      console.error('[Reject Profile API] Error fetching lobbyist:', fetchError);
      return new Response(JSON.stringify({
        error: 'Lobbyist not found'
      }), { status: 404 });
    }

    // Confirmation check for rejecting active profiles
    if (lobbyist.is_active && !body.confirmed) {
      return new Response(JSON.stringify({
        error: 'This profile is currently active. Please confirm rejection.',
        requireConfirmation: true,
        profileName: `${lobbyist.first_name} ${lobbyist.last_name}`
      }), { status: 400 });
    }

    // Update profile with rejection details
    const { error: updateError } = await serverClient
      .from('lobbyists')
      .update({
        is_pending: false,
        is_active: false,
        is_rejected: true,
        approval_status: 'rejected', // Set approval status
        rejection_reason: userMessage,
        rejection_category: category,
        rejected_at: new Date().toISOString(),
        rejected_by: user.id,
        rejection_count: (lobbyist.rejection_count || 0) + 1,
        pending_reason: `Rejected: ${category.replace(/_/g, ' ')}`,
      })
      .eq('id', lobbyistId);

    if (updateError) {
      console.error('[Reject Profile API] Error updating profile:', updateError);
      return new Response(JSON.stringify({
        error: 'Error rejecting profile'
      }), { status: 500 });
    }

    console.log('[Reject Profile API] Profile rejected successfully');

    // Send rejection email if enabled
    let emailSent = false;
    if (sendEmail && lobbyist.email) {
      try {
        // Import email sending function
        const { Resend } = await import('resend');
        const resend = new Resend(import.meta.env.RESEND_API_KEY);

        // Generate actionable steps based on category
        const actionableSteps = getActionableSteps(category);

        const { error: emailError } = await resend.emails.send({
          from: 'TexasLobby.org <noreply@texaslobby.org>',
          to: lobbyist.email,
          subject: 'Profile Revision Needed - TexasLobby.org',
          html: generateRejectionEmail(
            `${lobbyist.first_name} ${lobbyist.last_name}`,
            userMessage,
            actionableSteps,
            `${import.meta.env.PUBLIC_SITE_URL}/dashboard/resubmit`
          ),
        });

        if (emailError) {
          console.error('[Reject Profile API] Error sending email:', emailError);
        } else {
          emailSent = true;
          console.log('[Reject Profile API] Rejection email sent to:', lobbyist.email);
        }
      } catch (emailError) {
        console.error('[Reject Profile API] Email sending failed:', emailError);
        // Don't fail the rejection if email fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Profile rejected successfully',
      emailSent,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Reject Profile API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Helper function to get actionable steps based on rejection category
function getActionableSteps(category: string): string[] {
  switch (category) {
    case 'invalid_id':
      return [
        'Upload a clear, high-quality photo of your government-issued ID',
        'Ensure your name is clearly visible on the document',
        'Accepted: Driver\'s license, passport, or state ID'
      ];
    case 'incomplete_info':
      return [
        'Complete all required fields (bio, cities served, expertise areas)',
        'Provide detailed professional bio',
        'Add your contact information and website'
      ];
    case 'duplicate_profile':
      return [
        'Search for your existing profile and claim it instead',
        'Or contact support if you believe this is an error',
        'Do not create multiple profiles'
      ];
    case 'not_registered_lobbyist':
      return [
        'Provide your Texas Ethics Commission registration number',
        'Verify you are registered at ethics.state.tx.us',
        'Contact support for assistance with verification'
      ];
    case 'fake_profile':
      return [
        'This profile appears fraudulent or impersonates another person',
        'Contact support if you believe this is an error',
        'Provide documentation to verify your identity'
      ];
    case 'other':
      return [
        'Review the specific feedback provided above',
        'Make the requested corrections',
        'Contact support if you have questions'
      ];
    default:
      return ['Review the feedback above and make necessary corrections'];
  }
}

// Generate rejection email HTML
function generateRejectionEmail(
  name: string,
  reason: string,
  steps: string[],
  resubmitUrl: string
): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f59e0b; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Profile Needs Revision</h1>
        </div>

        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Hi ${name},</p>

          <p>Thank you for submitting your lobbyist profile to TexasLobby.org. After reviewing your submission, we need some additional information or corrections before we can approve your profile.</p>

          <div style="background-color: #fffbeb; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; font-weight: 600; color: #92400e;">Reason:</p>
            <p style="margin: 0; color: #78350f;">${reason}</p>
          </div>

          ${steps.length > 0 ? `
            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0; font-weight: 600;">What You Need to Do:</p>
              <ul style="margin: 0; padding-left: 20px;">
                ${steps.map(step => `<li style="margin: 5px 0;">${step}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resubmitUrl}" style="display: inline-block; background-color: #003f87; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Revise & Resubmit Profile</a>
          </div>

          <div style="background-color: #dbeafe; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px;"><strong>💡 Helpful Tips:</strong></p>
            <ul style="margin: 5px 0 0 0; padding-left: 20px; font-size: 14px;">
              <li>Make sure all required fields are complete</li>
              <li>Upload a clear, high-quality ID photo</li>
              <li>Double-check your contact information</li>
            </ul>
          </div>

          <p>We review resubmissions within 24-48 hours. If you have questions or need clarification, please don't hesitate to contact us at <a href="mailto:support@texaslobby.org" style="color: #003f87;">support@texaslobby.org</a>.</p>

          <p style="margin-top: 30px;">Best regards,<br><strong>The TexasLobby.org Team</strong></p>
        </div>

        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>TexasLobby.org - Connecting Texas Businesses with Experienced Lobbyists</p>
          <p>
            <a href="https://texaslobby.org" style="color: #003f87; text-decoration: none;">Visit Website</a> |
            <a href="${resubmitUrl}" style="color: #003f87; text-decoration: none;">Resubmit Profile</a>
          </p>
        </div>
      </body>
    </html>
  `;
}
