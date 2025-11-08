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

export function subscriptionConfirmationEmail(lobbyistName: string, tier: 'premium' | 'featured', price: number) {
  const tierName = tier === 'premium' ? 'Premium' : 'Featured';

  return {
    subject: `Welcome to ${tierName}! Your Subscription is Active - TexasLobby.org`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to ${tierName}!</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${lobbyistName},</p>

            <p><strong>Your ${tierName} subscription is now active!</strong></p>

            <p>Thank you for upgrading to TexasLobby.org ${tierName}. Your enhanced profile is now live and will receive increased visibility to potential clients across Texas.</p>

            <div style="background-color: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your ${tierName} Benefits:</strong></p>
              <ul style="margin: 10px 0; padding-left: 20px;">
                ${tier === 'premium' ? `
                  <li>Enhanced visibility in search results</li>
                  <li>Priority placement in listings</li>
                  <li>Detailed analytics dashboard</li>
                  <li>Profile badge</li>
                  <li>Up to 10 client testimonials</li>
                ` : `
                  <li>Maximum visibility - top search results</li>
                  <li>Homepage featured placement</li>
                  <li>Featured badge with icon</li>
                  <li>Comprehensive analytics dashboard</li>
                  <li>Unlimited client testimonials</li>
                  <li>Priority customer support</li>
                `}
              </ul>
            </div>

            <div style="background-color: #f0f9ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;"><strong>Subscription Details:</strong></p>
              <p style="margin: 5px 0; font-size: 14px;">Plan: ${tierName} ($${price}/month)</p>
              <p style="margin: 5px 0; font-size: 14px;">Billing: Monthly</p>
              <p style="margin: 5px 0; font-size: 14px;">Next billing date: One month from today</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://texaslobby.org/dashboard" style="display: inline-block; background-color: #003f87; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Go to Dashboard</a>
            </div>

            <p>You can manage your subscription, view analytics, and update your profile anytime from your dashboard.</p>

            <p>If you have any questions, please contact us at <a href="mailto:support@texaslobby.org" style="color: #003f87;">support@texaslobby.org</a>.</p>

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

export function subscriptionCancelledEmail(lobbyistName: string, tier: 'premium' | 'featured', endDate: string) {
  const tierName = tier === 'premium' ? 'Premium' : 'Featured';

  return {
    subject: `Your ${tierName} Subscription Has Been Cancelled - TexasLobby.org`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #6b7280; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Subscription Cancelled</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${lobbyistName},</p>

            <p>We're sorry to see you go. Your ${tierName} subscription has been cancelled as requested.</p>

            <div style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #fbbf24; margin: 20px 0;">
              <p style="margin: 0;"><strong>Important:</strong> Your ${tierName} benefits will remain active until ${endDate}. After this date, your profile will revert to the free tier.</p>
            </div>

            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>What happens next:</strong></p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>You keep all ${tierName} features until ${endDate}</li>
                <li>After that, your profile returns to the free tier</li>
                <li>Your profile remains visible and searchable</li>
                <li>You can resubscribe at any time</li>
              </ul>
            </div>

            <p>We'd love to have you back! If you change your mind, you can resubscribe anytime from your dashboard.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://texaslobby.org/pricing" style="display: inline-block; background-color: #003f87; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Pricing Plans</a>
            </div>

            <p>If you cancelled by mistake or have feedback on how we can improve, please let us know at <a href="mailto:support@texaslobby.org" style="color: #003f87;">support@texaslobby.org</a>.</p>

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

export function paymentFailedEmail(lobbyistName: string, tier: 'premium' | 'featured') {
  const tierName = tier === 'premium' ? 'Premium' : 'Featured';

  return {
    subject: `Payment Failed - Action Required for Your ${tierName} Subscription`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #ef4444; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Payment Failed</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${lobbyistName},</p>

            <p><strong>We were unable to process your payment for your ${tierName} subscription.</strong></p>

            <p>This can happen for several reasons:</p>
            <ul>
              <li>Insufficient funds</li>
              <li>Expired or cancelled card</li>
              <li>Card security verification</li>
              <li>Bank declined the transaction</li>
            </ul>

            <div style="background-color: #fee2e2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0;">
              <p style="margin: 0;"><strong>Action Required:</strong> Please update your payment method to continue your ${tierName} subscription and avoid service interruption.</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://texaslobby.org/dashboard" style="display: inline-block; background-color: #003f87; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">Update Payment Method</a>
            </div>

            <p><strong>What happens if payment fails again:</strong></p>
            <ul>
              <li>We'll automatically retry charging your card</li>
              <li>If unsuccessful after multiple attempts, your subscription will be cancelled</li>
              <li>Your profile will revert to the free tier</li>
            </ul>

            <p>If you have questions or need assistance, please contact us at <a href="mailto:support@texaslobby.org" style="color: #003f87;">support@texaslobby.org</a>.</p>

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
