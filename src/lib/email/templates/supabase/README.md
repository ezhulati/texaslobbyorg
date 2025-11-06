# Supabase Email Templates

These are Supabase-compatible email templates using Go template syntax with TexasLobby.org branding.

## Files

1. **verify-email-supabase.html** - Email verification for new signups
2. **magic-link-supabase.html** - Magic link for passwordless login
3. **reset-password-supabase.html** - Password reset email

## How to Upload to Supabase

### Step 1: Access Email Templates

1. Go to: https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/auth/templates
2. You'll see three template types:
   - **Confirm signup** (Email Verification)
   - **Magic Link**
   - **Change Email Address** / **Reset Password**

### Step 2: Update Each Template

#### For "Confirm signup" Template:

1. Click on "Confirm signup"
2. Copy the entire contents of `verify-email-supabase.html`
3. Paste into the template editor
4. Update the subject line to: `Verify Your Email - TexasLobby.org`
5. Click "Save"

#### For "Magic Link" Template:

1. Click on "Magic Link"
2. Copy the entire contents of `magic-link-supabase.html`
3. Paste into the template editor
4. Update the subject line to: `Sign In to TexasLobby.org`
5. Click "Save"

#### For "Reset Password" Template:

1. Click on "Reset Password" (or "Change Email Address" depending on your Supabase version)
2. Copy the entire contents of `reset-password-supabase.html`
3. Paste into the template editor
4. Update the subject line to: `Reset Your TexasLobby.org Password`
5. Click "Save"

## Template Variables

These templates use Supabase's Go template variables:

- `{{ .ConfirmationURL }}` - The confirmation/action link
- `{{ .Email }}` - User's email address
- `{{ .SiteURL }}` - Your site URL (configured in Supabase settings)
- `{{ .Token }}` - Token for magic link/reset (usually part of ConfirmationURL)

## Testing

After uploading the templates:

1. **Test Email Verification:**
   - Sign up with a new email at https://texaslobby.org
   - Check the email inbox for the verification email

2. **Test Magic Link:**
   - Go to login page
   - Click "Sign in with magic link"
   - Enter your email
   - Check inbox for magic link email

3. **Test Password Reset:**
   - Go to login page
   - Click "Forgot password?"
   - Enter your email
   - Check inbox for password reset email

## Customization

To customize these templates:

1. Edit the HTML files in this directory
2. Test locally by viewing in a browser
3. Copy updated content to Supabase dashboard
4. Save and test

## Styling

All styles are inline for maximum email client compatibility. The design features:

- **Colors:**
  - Primary blue: #003DA5
  - Dark blue: #002D7A
  - Texas red: #BF0A30

- **Responsive design** - Works on mobile and desktop
- **Professional branding** - TexasLobby.org logo and colors
- **Security messaging** - Clear explanations of security features

## Troubleshooting

### Templates not updating
- Clear browser cache
- Wait a few minutes for Supabase to propagate changes
- Test with a new email address

### Styles not displaying
- All critical styles are inline
- Email clients may strip some CSS
- Test in multiple email clients (Gmail, Outlook, Apple Mail)

### Variables not working
- Ensure you're using exactly `{{ .VariableName }}` syntax
- Check Supabase template documentation for your version
- Variables are case-sensitive

## Support

For issues with these templates:
- Check the main EMAIL_SETUP.md guide
- Review Supabase Auth documentation: https://supabase.com/docs/guides/auth
- Contact support at support@texaslobby.org
