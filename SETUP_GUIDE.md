# TexasLobby.org - Setup & Implementation Guide

## Project Status: Foundation Complete (Week 1, Day 1)

### Completed ✅

1. **Project Initialization**
   - Astro 5.x + React 18 + Tailwind CSS configured
   - TypeScript strict mode enabled
   - Netlify adapter installed for deployment
   - Package.json with all dependencies

2. **Database Schema**
   - Complete PostgreSQL schema in `supabase/migrations/001_initial_schema.sql`
   - 7 core tables: users, lobbyists, cities, subject_areas, clients, favorites, page_views
   - Row Level Security (RLS) policies configured
   - Full-text search function for lobbyists
   - Seed data for 10 cities and 12 subject areas

3. **Data Import System**
   - CSV import script for lobbyist data (`scripts/import-lobbyists.ts`)
   - Sample data file provided
   - Batch processing for large datasets

4. **Core Components**
   - Layout component with Header and Footer
   - SEO component with Schema.org markup
   - Responsive navigation
   - shadcn/ui Button and Input components

5. **Homepage**
   - Hero section with StoryBrand messaging
   - SearchFilter React component (interactive island)
   - Problem/Solution section
   - Featured lobbyists showcase
   - CTA sections

### Next Steps (Remaining 3 Weeks)

#### Week 1, Days 2-5
- [ ] Build lobbyist search results page
- [ ] Create individual lobbyist profile pages
- [ ] Set up Supabase Auth
- [ ] Build login/signup pages
- [ ] Create profile claim flow

#### Week 2
- [ ] Integrate Stripe for subscriptions
- [ ] Build lobbyist dashboard
- [ ] Create 3-5 city landing pages
- [ ] Create 3-5 subject area pages
- [ ] Set up Resend for emails

#### Week 3
- [ ] E2E testing with Playwright
- [ ] Performance optimization (Lighthouse 90+)
- [ ] Deploy to Netlify
- [ ] Set up CI/CD
- [ ] Final polish and launch

---

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- pnpm installed (or use npm)
- Supabase account
- Stripe account (test mode)
- Resend account

### 1. Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Fill in these values:

```env
# Get from supabase.com dashboard
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Get from stripe.com dashboard
PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Get from resend.com
RESEND_API_KEY=re_...

# Local development
PUBLIC_SITE_URL=http://localhost:4321
```

### 2. Database Setup

#### Option A: Using Supabase Dashboard

1. Go to https://supabase.com and create a new project
2. Navigate to **SQL Editor**
3. Copy contents of `supabase/migrations/001_initial_schema.sql`
4. Click "Run"
5. Copy contents of `supabase/seed.sql`
6. Click "Run"

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install supabase --save-dev

# Link to your project
npx supabase link --project-ref your-project-ref

# Run migrations
npx supabase db push

# Run seeds
npx supabase db seed
```

### 3. Import Lobbyist Data

If you have a CSV file with lobbyist data:

```bash
# Place your CSV at: data/lobbyists.csv
# Format: FirstName,LastName,Email,Phone,Cities,SubjectAreas

# Run import
npx tsx scripts/import-lobbyists.ts
```

Example CSV format:
```
FirstName,LastName,Email,Phone,Cities,SubjectAreas
John,Doe,john@example.com,512-555-0100,Austin;Dallas,Healthcare;Energy
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Visit http://localhost:4321

---

## Project Structure

```
texaslobby.org/
├── .astro/                  # Generated type definitions
├── .specify/                # Spec workflow templates
├── data/                    # Data files
│   └── lobbyists-sample.csv
├── public/                  # Static assets
├── scripts/                 # Utility scripts
│   └── import-lobbyists.ts
├── src/
│   ├── components/
│   │   ├── astro/          # Static components
│   │   │   ├── Footer.astro
│   │   │   ├── Header.astro
│   │   │   ├── Layout.astro
│   │   │   └── SEO.astro
│   │   ├── react/          # Interactive islands
│   │   │   └── SearchFilter.tsx
│   │   └── ui/             # shadcn/ui components
│   │       ├── button.tsx
│   │       └── input.tsx
│   ├── lib/
│   │   ├── api/            # API functions
│   │   ├── database.types.ts
│   │   ├── supabase.ts
│   │   └── utils.ts
│   ├── pages/
│   │   └── index.astro     # Homepage
│   └── styles/
│       └── globals.css
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed.sql
├── .env.example
├── .gitignore
├── astro.config.mjs
├── package.json
├── README.md
├── tailwind.config.mjs
└── tsconfig.json
```

---

## Tech Stack Decisions

### Why Astro?
- **Fast:** Static site generation with optional server rendering
- **SEO-friendly:** Best-in-class performance out of the box
- **Islands architecture:** Ship minimal JavaScript
- **Great DX:** Hot module replacement, TypeScript support

### Why Supabase?
- **All-in-one:** Database + Auth + Storage + Real-time
- **PostgreSQL:** Full-power SQL with great performance
- **Row Level Security:** Built-in authorization
- **Generous free tier:** Perfect for MVP

### Why Stripe?
- **Industry standard:** Most trusted payment platform
- **Great docs:** Easy to integrate
- **Customer Portal:** Self-service subscription management
- **Test mode:** Safe development environment

### Why Resend?
- **Modern DX:** Best email API for developers
- **React Email:** Use React components for templates
- **Reliable:** Built by experienced team
- **Affordable:** $20/mo for 50k emails

### Why Netlify?
- **Zero config:** Astro works out of the box
- **Edge functions:** Fast server-side rendering
- **Free SSL:** Automatic HTTPS
- **Git integration:** Auto-deploy on push

---

## Development Workflow

### 1. Make Changes

Edit files in `src/`:
- `src/pages/` for new pages
- `src/components/` for reusable components
- `src/lib/` for utilities and API functions

### 2. Test Locally

```bash
npm run dev        # Start dev server
npm run build      # Test production build
npm run preview    # Preview production build
```

### 3. Type Check

```bash
npm run type-check  # Check TypeScript errors
```

### 4. Lint

```bash
npm run lint       # Run ESLint
```

### 5. Commit

```bash
git add .
git commit -m "Description of changes"
git push
```

Netlify will automatically deploy when you push to `main`.

---

## Database Queries

### Search Lobbyists

```typescript
import { supabase } from '@/lib/supabase';

const { data } = await supabase.rpc('search_lobbyists', {
  search_query: 'healthcare',
  city_filters: ['austin', 'dallas'],
  subject_filters: ['healthcare'],
  limit_count: 20,
  offset_count: 0
});
```

### Get Lobbyist by Slug

```typescript
const { data } = await supabase
  .from('lobbyists')
  .select('*')
  .eq('slug', 'john-doe')
  .single();
```

### Get Cities

```typescript
const { data } = await supabase
  .from('cities')
  .select('*')
  .order('name');
```

### Get Subject Areas

```typescript
const { data } = await supabase
  .from('subject_areas')
  .select('*')
  .order('name');
```

---

## Troubleshooting

### Build Errors

**Error:** `Cannot find module '@/lib/supabase'`
- **Fix:** Check `tsconfig.json` has correct `paths` configuration

**Error:** `Missing environment variables`
- **Fix:** Ensure `.env` file exists with all required variables

### Database Errors

**Error:** `relation "lobbyists" does not exist`
- **Fix:** Run migrations in Supabase SQL Editor

**Error:** `permission denied for table lobbyists`
- **Fix:** Check RLS policies are correctly configured

### Import Errors

**Error:** `CSV file not found`
- **Fix:** Place CSV file at `data/lobbyists.csv`

---

## Resources

- [Astro Docs](https://docs.astro.build)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Resend Docs](https://resend.com/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

---

## Support

If you encounter issues:

1. Check this guide first
2. Review the comprehensive spec in `PRIMARY AUDIENCE SEGMENTS.md`
3. Check `README.md` for quick reference
4. Review error messages carefully - they usually point to the issue

---

**Last Updated:** 2025-11-04
**Version:** 1.0.0
**Status:** Foundation Complete, Ready for Feature Development
