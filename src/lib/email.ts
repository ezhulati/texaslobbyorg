import { Resend } from 'resend';

const resendApiKey = import.meta.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('RESEND_API_KEY not found - email sending will fail');
}

const resend = new Resend(resendApiKey);

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (!resendApiKey) {
    console.error('Cannot send email - RESEND_API_KEY not configured');
    return { error: 'Email service not configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'TexasLobby.org <noreply@texaslobby.org>',
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { error };
    }

    return { data };
  } catch (error: any) {
    console.error('Email send exception:', error);
    return { error: error.message };
  }
}

// Email Templates

export function profileSubmittedEmail(lobbyistName: string) {
  return {
    subject: 'Your Profile Has Been Submitted - TexasLobby.org',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #003f87; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">TexasLobby.org</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #003f87; margin-top: 0;">Profile Submitted Successfully!</h2>

            <p>Hi ${lobbyistName},</p>

            <p>Thank you for submitting your lobbyist profile to TexasLobby.org!</p>

            <p>Your profile is now being reviewed by our team. We'll email you within 24-48 hours once it's been approved and published.</p>

            <div style="background-color: white; padding: 20px; border-left: 4px solid #003f87; margin: 20px 0;">
              <p style="margin: 0;"><strong>What happens next:</strong></p>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Our admin team reviews your profile</li>
                <li>You receive an approval email</li>
                <li>Your profile goes live and is searchable</li>
                <li>Potential clients can find and contact you</li>
              </ol>
            </div>

            <p>If you have any questions, please don't hesitate to reach out to us at <a href="mailto:support@texaslobby.org" style="color: #003f87;">support@texaslobby.org</a>.</p>

            <p style="margin-top: 30px;">Best regards,<br><strong>The TexasLobby.org Team</strong></p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>TexasLobby.org - Connecting Texas Businesses with Experienced Lobbyists</p>
            <p>
              <a href="https://texaslobby.org" style="color: #003f87; text-decoration: none;">Visit Website</a> |
              <a href="https://texaslobby.org/dashboard" style="color: #003f87; text-decoration: none;">Dashboard</a>
            </p>
          </div>
        </body>
      </html>
    `,
  };
}

export function profileApprovedEmail(lobbyistName: string, profileUrl: string) {
  return {
    subject: 'Your Profile is Now Live! - TexasLobby.org',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Profile Approved!</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${lobbyistName},</p>

            <p><strong>Great news!</strong> Your lobbyist profile has been approved and is now live on TexasLobby.org.</p>

            <p>Potential clients can now find you when searching for lobbyists in your areas of expertise.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${profileUrl}" style="display: inline-block; background-color: #003f87; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Your Profile</a>
            </div>

            <div style="background-color: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p style="margin: 0;"><strong>Next Steps:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Share your profile link with potential clients</li>
                <li>Keep your profile updated with new clients and expertise</li>
                <li>Consider upgrading to Premium or Featured for increased visibility</li>
              </ul>
            </div>

            <p>Thank you for choosing TexasLobby.org!</p>

            <p style="margin-top: 30px;">Best regards,<br><strong>The TexasLobby.org Team</strong></p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>TexasLobby.org - Connecting Texas Businesses with Experienced Lobbyists</p>
          </div>
        </body>
      </html>
    `,
  };
}

export function adminNewProfileEmail(lobbyistName: string, adminUrl: string) {
  return {
    subject: 'New Lobbyist Profile Awaiting Approval - TexasLobby.org',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f59e0b; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Profile for Review</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p><strong>${lobbyistName}</strong> has submitted a new lobbyist profile for approval.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${adminUrl}" style="display: inline-block; background-color: #003f87; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Review Profile</a>
            </div>

            <p style="color: #666; font-size: 14px;">Please review and approve/reject this profile within 24-48 hours.</p>
          </div>
        </body>
      </html>
    `,
  };
}
