# Configure Resend SMTP for Supabase

This guide will help you configure Supabase to use Resend's SMTP for sending authentication emails.

## Prerequisites

You'll need:
1. **Supabase Access Token** - Personal access token from Supabase dashboard
2. **Resend API Key** - Already in your .env file

## Step 1: Get Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name like "SMTP Configuration"
4. Copy the token (it will only be shown once!)

## Step 2: Run the Configuration Script

Once you have the token, run:

```bash
SUPABASE_TOKEN=sbp_your_token_here \
RESEND_API_KEY=$RESEND_API_KEY \
npx tsx scripts/configure-resend-smtp.ts
```

Or export the token first:

```bash
export SUPABASE_TOKEN=sbp_your_token_here
npx tsx scripts/configure-resend-smtp.ts
```

## What This Does

The script will configure Supabase to use:
- **SMTP Host:** smtp.resend.com
- **SMTP Port:** 465 (SSL)
- **SMTP User:** resend
- **SMTP Password:** Your Resend API key
- **Sender Email:** noreply@texaslobby.org
- **Sender Name:** TexasLobby.org

## Step 3: Test the Configuration

After running the script, test email sending by:

1. **Sign up a new user** at http://localhost:4323 or https://texaslobby.org
2. Check your email inbox for the verification email
3. Check Resend dashboard at https://resend.com/emails for delivery logs

## Alternative: Configure via Supabase Dashboard

If you prefer to configure manually:

1. Go to Supabase Dashboard → Project Settings → Auth → SMTP Settings
2. Enable "Enable Custom SMTP"
3. Enter the following:
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: Your Resend API key (from .env)
   - Sender email: `noreply@texaslobby.org`
   - Sender name: `TexasLobby.org`
4. Click "Save"

## Step 4: Customize Email Templates (Optional)

You can customize the email templates in:
- Supabase Dashboard → Auth → Email Templates
- Use the HTML from `src/lib/email/templates/` as a reference

## Troubleshooting

### Emails not sending
- Verify DNS records are configured in Netlify (should already be done)
- Check Resend dashboard for errors
- Verify RESEND_API_KEY is correct

### Emails going to spam
- Ensure SPF, DKIM, and DMARC DNS records are configured
- Check sender reputation in Resend dashboard

## Next Steps

Once SMTP is configured and tested:
1. Users will receive branded TexasLobby.org emails for:
   - Email verification (signup)
   - Magic link login
   - Password reset
2. All emails will be sent through Resend with proper authentication
3. You can monitor email delivery in the Resend dashboard
