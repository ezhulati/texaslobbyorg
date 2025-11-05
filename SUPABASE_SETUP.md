# Supabase Setup Guide

This guide will help you set up your Supabase database for TexasLobby.org.

## Prerequisites

- Supabase account (sign up at https://supabase.com)
- Supabase CLI installed (already installed ✅)

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name:** texaslobby-org
   - **Database Password:** (save this - you'll need it!)
   - **Region:** Choose closest to you (e.g., US East)
   - **Pricing Plan:** Free tier is fine for development
4. Click "Create new project" and wait ~2 minutes for setup

## Step 2: Get Your Project Credentials

Once your project is created:

1. Go to **Settings** > **General**
2. Copy your **Reference ID** (looks like `abcdefghijklmnop`)
3. Go to **Settings** > **API**
4. Copy:
   - **Project URL** (anon/public key endpoint)
   - **anon/public key**
   - **service_role key** (keep this secret!)

## Step 3: Set Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from .env.example
cp .env.example .env
```

Then fill in these values:

```env
# From Supabase Dashboard > Settings > API
PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# Other required variables
PUBLIC_SITE_URL=http://localhost:4321
STRIPE_SECRET_KEY=sk_test_... (get from stripe.com later)
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (get from stripe.com later)
RESEND_API_KEY=re_... (get from resend.com later)
```

## Step 4: Link Your Local Project

```bash
# Set your project ref (from Step 2)
export SUPABASE_PROJECT_REF=your-project-ref

# Link to your project
supabase link --project-ref $SUPABASE_PROJECT_REF
```

When prompted, enter your database password from Step 1.

## Step 5: Run Migrations

Push the database schema to your Supabase project:

```bash
npm run db:push
```

This will create all the tables:
- ✅ users
- ✅ lobbyists
- ✅ cities
- ✅ subject_areas
- ✅ clients
- ✅ favorites
- ✅ page_views

## Step 6: Seed Sample Data

Load the initial data (10 cities, 12 subject areas):

```bash
npm run db:seed
```

Or do both steps at once:

```bash
npm run db:setup
```

## Step 7: Verify Setup

1. Go to your Supabase dashboard
2. Click **Table Editor**
3. You should see all 7 tables
4. Click on `cities` - you should see 10 cities (Houston, Dallas, Austin, etc.)
5. Click on `subject_areas` - you should see 12 areas (Healthcare, Energy, etc.)

## Step 8: Test Locally

Start your dev server:

```bash
npm run dev
```

Visit http://localhost:4321 - you should see:
- The homepage loads
- The search filter shows cities and subjects
- No database errors in the console

## Troubleshooting

### "Cannot connect to Docker daemon"

This is expected if you're not running local Supabase. Use the remote project instead (Steps 1-7 above).

### "Permission denied" errors

Make sure you've set up your `.env` file correctly with the service role key.

### "relation does not exist" errors

The migrations didn't run. Try:

```bash
# Check what's in your database
supabase db diff

# Push migrations again
npm run db:push
```

### Tables exist but no data

Run the seed script:

```bash
npm run db:seed
```

### Still having issues?

1. Check your `.env` file has correct credentials
2. Make sure your project is linked: `supabase link --project-ref YOUR_REF`
3. Check the Supabase dashboard for errors in **Logs**

## Next Steps

Once your database is set up:

1. ✅ Tables created
2. ✅ Sample data loaded
3. ⏭️ Import lobbyist data: `npx tsx scripts/import-lobbyists.ts`
4. ⏭️ Set up Stripe for payments
5. ⏭️ Set up Resend for emails
6. ⏭️ Deploy to Netlify

## Alternative: Manual Setup (Dashboard)

If you prefer not to use the CLI:

1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query
3. Copy contents of `supabase/migrations/001_initial_schema.sql`
4. Click **Run**
5. Create another query
6. Copy contents of `supabase/seed.sql`
7. Click **Run**

Done! Your database is now set up.
