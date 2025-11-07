/**
 * Check Supabase Email Configuration
 * This checks if email confirmation is enabled and email settings
 *
 * Usage: SUPABASE_TOKEN=your_token npx tsx scripts/check-supabase-email-config.ts
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_TOKEN;
const PROJECT_REF = 'tavwfbqflredtowjelbx';

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Error: SUPABASE_TOKEN environment variable is required');
  console.log('Usage: SUPABASE_TOKEN=your_token npx tsx scripts/check-supabase-email-config.ts');
  process.exit(1);
}

async function checkEmailConfig() {
  try {
    console.log('📧 Checking Supabase email configuration...\n');

    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get config: ${response.status} ${error}`);
    }

    const config = await response.json();

    console.log('Current Email Settings:');
    console.log('========================\n');
    console.log(`Email Signup Enabled: ${config.EXTERNAL_EMAIL_ENABLED}`);
    console.log(`Email Confirmation Required: ${config.MAILER_AUTOCONFIRM === false}`);
    console.log(`Site URL: ${config.SITE_URL}`);
    console.log(`\nRedirect URLs:\n${config.URI_ALLOW_LIST?.split(',').join('\n')}`);

    if (config.MAILER_AUTOCONFIRM === false) {
      console.log('\n⚠️  Email confirmation is ENABLED');
      console.log('   Users must verify their email before signing in');
      console.log('   Emails are sent via Supabase\'s email service');
    } else {
      console.log('\n✅ Email confirmation is DISABLED');
      console.log('   Users can sign in immediately without email verification');
    }

    console.log('\n💡 To disable email confirmation for development:');
    console.log('   Run: SUPABASE_TOKEN=your_token npx tsx scripts/disable-email-confirmation.ts');

  } catch (error) {
    console.error('❌ Error checking email config:', error);
    process.exit(1);
  }
}

checkEmailConfig();
