# Email Configuration Guide for TexasLobby.org

This guide explains how to configure professional custom emails using Resend for all authentication flows.

## Overview

We've created professional email templates for:
1. **Email Verification** - When users sign up
2. **Magic Link** - For passwordless login
3. **Password Reset** - When users request password reset

## Email Templates

All templates are located in `/src/lib/email/templates/` and feature:
- TexasLobby.org branding
- Professional HTML design
- Mobile-responsive layout
- Security best practices
- Clear call-to-action buttons

## Configuration Options

You have two options to use these custom emails:

### Option 1: Configure Supabase Custom SMTP (Recommended)

This allows Supabase to automatically send emails using your Resend SMTP credentials with custom templates.

#### Step 1: Get Resend SMTP Credentials

1. Log in to your Resend dashboard
2. Go to Settings → SMTP
3. Note down your SMTP credentials:
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (SSL) or `587` (TLS)
   - **Username**: Your Resend username
   - **Password**: Your Resend API key

#### Step 2: Configure Supabase SMTP

1. Go to Supabase Dashboard → Project Settings → Auth
2. Scroll to "SMTP Settings"
3. Enable "Enable Custom SMTP"
4. Enter your Resend SMTP credentials:
   ```
   Host: smtp.resend.com
   Port: 465
   Username: resend
   Password: re_your_api_key
   Sender email: noreply@texaslobby.org
   Sender name: TexasLobby.org
   ```

#### Step 3: Customize Email Templates in Supabase

1. In Supabase Dashboard → Auth → Email Templates
2. For each template (Confirm signup, Magic Link, Reset Password):
   - Click "Edit template"
   - Replace the default HTML with our custom templates
   - Use the template files from `/src/lib/email/templates/` as reference
   - Save changes

**Important Template Variables:**
- `{{ .ConfirmationURL }}` - Email confirmation link
- `{{ .Token }}` - Magic link/reset token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email address

### Option 2: Use Resend via API (Alternative)

If you prefer to send emails programmatically rather than through Supabase SMTP:

#### Step 1: Add Resend API Key

Add to your `.env` file:
```bash
RESEND_API_KEY=re_your_actual_api_key
```

#### Step 2: Create Database Webhooks/Functions

You'll need to create Supabase database functions or Edge Functions to intercept auth events and send emails via Resend:

1. **Email Verification**: Hook into user creation
2. **Magic Link**: Hook into OTP creation
3. **Password Reset**: Hook into password reset request

#### Step 3: Use the Email Service

```typescript
import { sendVerificationEmail, sendMagicLinkEmail, sendPasswordResetEmail } from '@/lib/email/resend';

// Example: Send verification email
await sendVerificationEmail({
  email: 'user@example.com',
  confirmationUrl: 'https://texaslobby.org/auth/verify?token=...'
});
```

## Testing Your Email Setup

### Test Email Verification
```bash
# Using Supabase client
const { error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123'
});
```

### Test Magic Link
```bash
const { error } = await supabase.auth.signInWithOtp({
  email: 'test@example.com'
});
```

### Test Password Reset
```bash
const { error } = await supabase.auth.resetPasswordForEmail('test@example.com');
```

## Email Template Customization

To customize the email templates:

1. Edit files in `/src/lib/email/templates/`
2. Modify the base template in `base.ts` for overall branding
3. Update individual templates:
   - `verify-email.ts` - Email verification
   - `magic-link.ts` - Magic link login
   - `reset-password.ts` - Password reset

### Base Template Features

The base template (`base.ts`) includes:
- TexasLobby.org header with logo
- Texas-themed color scheme (blue and red)
- Responsive design
- Professional footer with links
- Consistent styling

## Environment Variables

Required in `.env`:
```bash
# Resend
RESEND_API_KEY=re_your_actual_api_key

# Supabase (existing)
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Site URL
PUBLIC_SITE_URL=https://texaslobby.org
```

## Troubleshooting

### Emails Not Sending

1. **Check DNS Records**: Verify Resend DNS records are properly configured
2. **Check SMTP Credentials**: Ensure SMTP settings in Supabase are correct
3. **Check Sender Email**: Verify sender email matches verified domain
4. **Check Logs**: Review Supabase logs and Resend dashboard for errors

### Emails Going to Spam

1. **SPF/DKIM/DMARC**: Ensure DNS records are properly configured
2. **Sender Reputation**: Use consistent sender email
3. **Content**: Avoid spam trigger words
4. **Authentication**: Ensure DKIM signing is enabled in Resend

### Template Not Displaying Correctly

1. **HTML Validation**: Ensure HTML is valid
2. **Inline CSS**: Use inline styles for better email client compatibility
3. **Test Clients**: Test in multiple email clients (Gmail, Outlook, etc.)
4. **Images**: Use absolute URLs for images

## Best Practices

1. **Consistent Branding**: Use TexasLobby.org colors and logo
2. **Clear CTAs**: Make action buttons prominent and clear
3. **Security**: Include security tips in emails
4. **Mobile-First**: Ensure emails display well on mobile devices
5. **Testing**: Always test emails before deploying
6. **Monitoring**: Monitor email delivery rates in Resend dashboard

## Support

For issues or questions:
- Review Resend documentation: https://resend.com/docs
- Review Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Contact support: support@texaslobby.org
