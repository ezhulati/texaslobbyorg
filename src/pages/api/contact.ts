import type { APIRoute } from 'astro';
import { sendEmail } from '@/lib/email';

/**
 * Contact form submission API
 * Sends email to admin (enrizhulati@gmail.com) with contact form details
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('[Contact API] POST request received');

    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();
    const phone = formData.get('phone')?.toString();
    const subject = formData.get('subject')?.toString();
    const message = formData.get('message')?.toString();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email address'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Contact API] Sending contact form email:', { name, email, subject });

    // Prepare email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #003f87; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Contact Form Submission</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="margin-top: 0; color: #003f87;">Contact Information</h2>

            <div style="background-color: white; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${name}</p>
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #003f87;">${email}</a></p>
              ${phone ? `<p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
              <p style="margin: 0;"><strong>Subject:</strong> ${subject}</p>
            </div>

            <h3 style="color: #003f87; margin-bottom: 10px;">Message</h3>
            <div style="background-color: white; padding: 20px; border-radius: 6px; border-left: 4px solid #003f87;">
              <p style="margin: 0; white-space: pre-wrap;">${message}</p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 14px; color: #666;">
                <strong>Quick Reply:</strong>
                <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject)}" style="color: #003f87;">Reply to ${name}</a>
              </p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This message was sent from the TexasLobby.org contact form</p>
            <p><a href="https://texaslobby.org" style="color: #003f87; text-decoration: none;">TexasLobby.org</a></p>
          </div>
        </body>
      </html>
    `;

    // Send email to admin
    const emailResult = await sendEmail({
      to: 'enrizhulati@gmail.com',
      subject: `Contact Form: ${subject} - ${name}`,
      html: emailHtml
    });

    if (emailResult.error) {
      console.error('[Contact API] Failed to send email:', emailResult.error);
      return new Response(JSON.stringify({
        error: 'Failed to send message. Please try again.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[Contact API] Email sent successfully to enrizhulati@gmail.com');

    // Send auto-reply to user
    const autoReplyHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #10b981; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Message Received!</h1>
          </div>

          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${name},</p>

            <p>Thank you for contacting TexasLobby.org! We've received your message and will respond as soon as possible, typically within 1-2 business days.</p>

            <div style="background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Your Message:</strong></p>
              <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject}</p>
              <p style="margin: 0; white-space: pre-wrap; color: #666;">${message}</p>
            </div>

            <p>In the meantime, feel free to:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><a href="https://texaslobby.org/lobbyists" style="color: #003f87;">Browse our directory of Texas lobbyists</a></li>
              <li><a href="https://texaslobby.org/guides" style="color: #003f87;">Read our guides and resources</a></li>
              <li><a href="https://texaslobby.org/how-it-works" style="color: #003f87;">Learn how TexasLobby.org works</a></li>
            </ul>

            <p>If you have an urgent matter, please reply to this email with "URGENT" in the subject line.</p>

            <p style="margin-top: 30px;">Best regards,<br><strong>The TexasLobby.org Team</strong></p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>TexasLobby.org - Connecting Texas Businesses with Experienced Lobbyists</p>
            <p>
              <a href="https://texaslobby.org" style="color: #003f87; text-decoration: none;">Visit Website</a> |
              <a href="https://texaslobby.org/contact" style="color: #003f87; text-decoration: none;">Contact Us</a>
            </p>
          </div>
        </body>
      </html>
    `;

    // Send auto-reply to user (don't fail if this doesn't work)
    try {
      await sendEmail({
        to: email,
        subject: 'We received your message - TexasLobby.org',
        html: autoReplyHtml
      });
      console.log('[Contact API] Auto-reply sent to user:', email);
    } catch (autoReplyError) {
      console.warn('[Contact API] Failed to send auto-reply:', autoReplyError);
      // Don't fail the request if auto-reply fails
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Message sent successfully! We\'ll get back to you soon.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Contact API] Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'An unexpected error occurred. Please try again.',
      details: error?.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
