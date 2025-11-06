# Deployment Guide - Authentication Setup

## Current Setup (Local Development)

✅ **Working now:**
- Local dev server: http://localhost:4323
- Magic links redirect to localhost
- Email verification works
- All auth flows functional

## Production Deployment Steps

### 1. Configure Netlify Environment Variables

Go to: Netlify Dashboard → Your Site → Site settings → Environment variables

Add these variables:

```bash
# Supabase (same as local)
PUBLIC_SUPABASE_URL=https://tavwfbqflredtowjelbx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMTc2MDUsImV4cCI6MjA3Nzg5MzYwNX0.i8P2RJquVCxko884X_02dWaj5YB8WP7GuYH0MJKNGyc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMxNzYwNSwiZXhwIjoyMDc3ODkzNjA1fQ.Fxxb6Qt6K9WAHXik86PcaNSmiagYQicAv8ONtx6Np3Q

# Site URL (DIFFERENT for production!)
PUBLIC_SITE_URL=https://texaslobby.org

# Stripe (use LIVE keys when ready)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_FEATURED_PRICE_ID=price_...

# Resend
RESEND_API_KEY=re_...
```

### 2. Update Supabase to Production Mode

When you're ready to go live, run:

```bash
SUPABASE_TOKEN=your_token npx tsx scripts/update-supabase-auth-config-production.ts
```

This updates the Supabase Site URL from localhost to https://texaslobby.org

### 3. Deploy to Netlify

```bash
npm run build
# Or push to GitHub (Netlify auto-deploys)
```

## How It Works

### Local Development:
- `.env` file has `PUBLIC_SITE_URL=http://localhost:4323`
- Supabase Site URL is set to localhost
- Auth redirects go to localhost:4323

### Production:
- Netlify env vars have `PUBLIC_SITE_URL=https://texaslobby.org`
- Supabase Site URL is set to production URL
- Auth redirects go to texaslobby.org

## Important Notes

1. **Both URLs are always allowed** in Supabase redirect list
   - Localhost URLs (for development)
   - Production URLs (for live site)

2. **The Site URL determines default behavior**
   - Local: Defaults to localhost
   - Production: Defaults to production domain

3. **No code changes needed** when deploying
   - Environment variables handle everything
   - Same codebase works in both environments

## Testing Before Production

1. Test all flows locally first:
   - ✅ Signup with email verification
   - ✅ Login with password
   - ✅ Magic link
   - ✅ Password reset

2. Deploy to Netlify with production env vars

3. Test all flows on production

4. If issues, check:
   - Netlify env vars are set correctly
   - Supabase Site URL is updated to production
   - No typos in domain name

## Switch Back to Local Development

To switch Supabase back to local development:

```bash
SUPABASE_TOKEN=your_token npx tsx scripts/update-supabase-auth-config.ts
```

This sets Site URL back to localhost.
