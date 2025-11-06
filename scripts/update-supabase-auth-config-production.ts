/**
 * Update Supabase Auth Configuration for PRODUCTION
 *
 * This updates the Site URL to production URL
 * Run this when you're ready to deploy to production
 *
 * Usage: SUPABASE_TOKEN=your_token npx tsx scripts/update-supabase-auth-config-production.ts
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_TOKEN;
const PROJECT_REF = 'tavwfbqflredtowjelbx';

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Error: SUPABASE_TOKEN environment variable is required');
  console.log('Usage: SUPABASE_TOKEN=your_token npx tsx scripts/update-supabase-auth-config-production.ts');
  process.exit(1);
}

interface AuthConfig {
  SITE_URL: string;
  URI_ALLOW_LIST: string;
  DISABLE_SIGNUP?: boolean;
  EXTERNAL_EMAIL_ENABLED?: boolean;
  EXTERNAL_PHONE_ENABLED?: boolean;
  MAILER_AUTOCONFIRM?: boolean;
}

async function updateAuthConfig() {
  try {
    console.log('🚀 Updating Supabase auth configuration for PRODUCTION...\n');

    // Configuration for PRODUCTION
    const config: AuthConfig = {
      SITE_URL: 'https://texaslobby.org',
      URI_ALLOW_LIST: [
        'http://localhost:4323/**',
        'http://localhost:4323/auth/verify',
        'http://localhost:4323/auth/callback',
        'http://localhost:4323/auth/reset-password',
        'http://localhost:4323/dashboard',
        'https://texaslobby.org/**',
        'https://texaslobby.org/auth/verify',
        'https://texaslobby.org/auth/callback',
        'https://texaslobby.org/auth/reset-password',
        'https://texaslobby.org/dashboard',
      ].join(','),
      DISABLE_SIGNUP: false,
      EXTERNAL_EMAIL_ENABLED: true,
      MAILER_AUTOCONFIRM: false,
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
      throw new Error(`Failed to update config: ${response.status} ${error}`);
    }

    const result = await response.json();

    console.log('✅ Auth configuration updated for PRODUCTION!\n');
    console.log('📋 Updated settings:');
    console.log(`   Site URL: ${config.SITE_URL} (PRODUCTION)`);
    console.log(`   Redirect URLs configured: ${config.URI_ALLOW_LIST.split(',').length} URLs`);
    console.log('\n🔗 Allowed redirect URLs:');
    config.URI_ALLOW_LIST.split(',').forEach(url => {
      console.log(`   - ${url}`);
    });
    console.log('\n✨ Production auth is ready!');
    console.log('⚠️  Remember to set PUBLIC_SITE_URL=https://texaslobby.org in Netlify environment variables');

  } catch (error) {
    console.error('❌ Error updating auth config:', error);
    process.exit(1);
  }
}

updateAuthConfig();
