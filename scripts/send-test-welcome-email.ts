import { Resend } from 'resend';
import { subscriptionConfirmationEmail } from '../src/lib/email';

async function sendTestEmail() {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const emailTemplate = subscriptionConfirmationEmail(
    'Enri',
    'featured',
    597
  );

  try {
    const { data, error } = await resend.emails.send({
      from: 'TexasLobby.org <noreply@texaslobby.org>',
      to: ['enri@albaniavisit.com'],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return;
    }

    console.log('✅ Test email sent successfully!');
    console.log('Email ID:', data?.id);
    console.log('\nCheck your inbox at: enri@albaniavisit.com');
    console.log('Subject:', emailTemplate.subject);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

sendTestEmail();
