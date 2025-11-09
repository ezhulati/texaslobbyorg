# Fix Supabase Email Template

## The Problem
The confirmation email shows `${data.confirmationUrl}` instead of the actual verification link.

## Solution 1: Via Supabase Dashboard (Recommended - 2 minutes)

1. Go to https://supabase.com/dashboard
2. Select your TexasLobby.org project
3. Click **Authentication** → **Email Templates**
4. Click on **"Confirm signup"**
5. Replace the template with the code below
6. Click **Save**

### Email Template Code:

```html
<h2>Welcome to TexasLobby.org!</h2>

<p>Thank you for creating an account with TexasLobby.org, the premier directory for finding experienced Texas lobbyists.</p>

<p>To get started and access all features, please verify your email address by clicking the button below:</p>

<p><a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #003f87; color: white; text-decoration: none; border-radius: 5px; margin: 16px 0;">Verify Email Address</a></p>

<h3>Why verify your email?</h3>
<p>Email verification helps us ensure the security of your account and allows you to:</p>
<ul>
  <li>Receive important updates about your account</li>
  <li>Reset your password if needed</li>
  <li>Access exclusive features and notifications</li>
</ul>

<p>If the button above doesn't work, copy and paste this link into your browser:</p>
<p><a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>

<p>If you didn't create an account with TexasLobby.org, you can safely ignore this email.</p>

<hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;">

<p style="color: #6b7280; font-size: 12px;">This link will expire in 24 hours for security reasons.</p>
```

## Solution 2: Via Supabase CLI (If you want to manage in code)

The Supabase CLI doesn't directly support email template updates yet. Email templates must be updated via:
- Supabase Dashboard (recommended)
- Supabase Management API (advanced)

## After Updating the Template

1. Sign up with a **new email address** (not one you've already used)
2. Check your email - the verification link should now work
3. Click the link to verify and complete signup

## Important Notes

- Use `{{ .ConfirmationURL }}` (double curly braces with dot) - this is Supabase's template syntax
- NOT `${data.confirmationUrl}` (JavaScript template literal - doesn't work in Supabase)
- The template applies to all future verification emails immediately after saving
