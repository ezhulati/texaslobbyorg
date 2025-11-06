/**
 * Configure Resend SMTP for Supabase Auth
 *
 * This script configures Supabase to use Resend's SMTP for sending authentication emails
 *
 * Usage: SUPABASE_TOKEN=your_token RESEND_API_KEY=your_key npx tsx scripts/configure-resend-smtp.ts
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const PROJECT_REF = 'tavwfbqflredtowjelbx';

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Error: SUPABASE_TOKEN environment variable is required');
  console.log('Get your token from: https://supabase.com/dashboard/account/tokens');
  console.log('Usage: SUPABASE_TOKEN=your_token RESEND_API_KEY=your_key npx tsx scripts/configure-resend-smtp.ts');
  process.exit(1);
}

if (!RESEND_API_KEY) {
  console.error('❌ Error: RESEND_API_KEY environment variable is required');
  console.log('Usage: SUPABASE_TOKEN=your_token RESEND_API_KEY=your_key npx tsx scripts/configure-resend-smtp.ts');
  process.exit(1);
}

interface SMTPConfig {
  SMTP_ADMIN_EMAIL: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_SENDER_NAME: string;
}

async function configureSMTP() {
  try {
    console.log('🔧 Configuring Resend SMTP for Supabase Auth...\n');

    const config: SMTPConfig = {
      SMTP_ADMIN_EMAIL: 'noreply@texaslobby.org',
      SMTP_HOST: 'smtp.resend.com',
      SMTP_PORT: 465,
      SMTP_USER: 'resend',
      SMTP_PASS: RESEND_API_KEY,
      SMTP_SENDER_NAME: 'TexasLobby.org',
    };

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update SMTP config: ${response.status} ${error}`);
    }

    const result = await response.json();

    console.log('✅ SMTP configuration updated successfully!\n');
    console.log('📋 SMTP Settings:');
    console.log(`   Host: ${config.SMTP_HOST}`);
    console.log(`   Port: ${config.SMTP_PORT}`);
    console.log(`   User: ${config.SMTP_USER}`);
    console.log(`   Sender: ${config.SMTP_SENDER_NAME} <${config.SMTP_ADMIN_EMAIL}>`);
    console.log('\n✨ Supabase will now send emails through Resend!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test email verification by signing up a new user');
    console.log('   2. Check Resend dashboard for email delivery logs');
    console.log('   3. Optionally customize email templates in Supabase Dashboard → Auth → Email Templates');

  } catch (error) {
    console.error('❌ Error configuring SMTP:', error);
    process.exit(1);
  }
}

configureSMTP();
