# TexasLobby.org

> Modern marketplace connecting Texas business owners with experienced lobbyists

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Supabase and Stripe credentials

# Run development server
npm run dev
```

Visit `http://localhost:4321`

## Database Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your project URL and anon key to `.env`
3. Copy your service role key to `.env`

### 2. Run Migrations

In your Supabase dashboard:

1. Go to **SQL Editor**
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Run the migration
4. Copy contents of `supabase/seed.sql`
5. Run the seed data

### 3. Import Lobbyist Data

```bash
# Place your CSV file at: data/lobbyists.csv
# Format: FirstName,LastName,Email,Phone,Cities,SubjectAreas

# Run import script
npx tsx scripts/import-lobbyists.ts
```

A sample CSV is provided at `data/lobbyists-sample.csv` for testing.

## Tech Stack

- **Frontend:** Astro 4.x + React 18
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Payments:** Stripe
- **Email:** Resend
- **Hosting:** Netlify

## Project Structure

```
texaslobby.org/
├── src/
│   ├── components/
│   │   ├── astro/       # Static Astro components
│   │   ├── react/       # Interactive React islands
│   │   └── ui/          # shadcn/ui components
│   ├── pages/
│   │   ├── index.astro  # Homepage
│   │   ├── lobbyists/   # Lobbyist directory & profiles
│   │   └── api/         # API routes
│   ├── lib/
│   │   ├── supabase.ts  # Supabase client
│   │   └── api/         # API functions
│   └── styles/
│       └── globals.css  # Global styles
├── supabase/
│   ├── migrations/      # Database migrations
│   └── seed.sql         # Seed data
├── scripts/
│   └── import-lobbyists.ts  # CSV import script
└── data/
    └── lobbyists.csv    # Lobbyist data to import
```

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Run TypeScript checks
npm run lint         # Run ESLint
```

## Environment Variables

See `.env.example` for required variables:

- `PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-only)
- `PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key
- `STRIPE_SECRET_KEY` - Stripe secret key (server-only)
- `RESEND_API_KEY` - Resend API key (server-only)

## Next Steps

1. ✅ Initialize project
2. ✅ Set up database schema
3. ✅ Create import script
4. 🔲 Build core components
5. 🔲 Create homepage
6. 🔲 Build search functionality
7. 🔲 Create profile pages
8. 🔲 Set up authentication
9. 🔲 Integrate Stripe
10. 🔲 Deploy to Netlify

## Documentation

See `PRIMARY AUDIENCE SEGMENTS.md` for complete product specifications.

## License

Proprietary - All rights reserved
