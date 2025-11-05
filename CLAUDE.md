# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TexasLobby.org** is a marketplace connecting Texas business owners with experienced lobbyists. Built with Astro 5 + React 18, deployed on Netlify with SSR.

**Current Status:** Early-stage MVP (~25% complete, Week 1 done)
**Launch Target:** December 1, 2025 (4-week sprint)

## Development Commands

```bash
# Development
npm run dev              # Start dev server at http://localhost:4321
npm run build            # Type-check + production build
npm run preview          # Preview production build locally

# Quality checks
npm run type-check       # Run Astro/TypeScript checks
npm run lint             # Run ESLint

# Database operations
npm run db:push          # Push schema to Supabase
npm run db:seed          # Run seed.sql
npm run db:setup         # Push + seed in one command

# Data import
npx tsx scripts/import-lobbyists.ts  # Import CSV lobbyist data
```

## Tech Stack Architecture

### Core Framework: Astro Islands Architecture

**Why Astro:** Ships minimal JavaScript, SEO-friendly static HTML, selective hydration only where needed.

- **Astro components** (`src/components/astro/*.astro`): Server-rendered, static HTML (Layout, Header, Footer, SEO)
- **React islands** (`src/components/react/*.tsx`): Interactive components with client-side hydration (SearchFilter)
- **UI primitives** (`src/components/ui/*.tsx`): shadcn/ui copy-paste components (Button, Input)

**Hydration directives:**
```astro
<SearchFilter client:load />      <!-- Hydrate immediately -->
<Component client:idle />         <!-- Hydrate when idle -->
<Component client:visible />      <!-- Hydrate on viewport entry -->
```

### Database: Supabase (PostgreSQL)

**Two-client pattern** (critical for security):

1. **Public client** (`src/lib/supabase.ts`):
   - Uses `PUBLIC_SUPABASE_ANON_KEY`
   - Safe for client-side React components
   - Respects Row Level Security (RLS) policies

2. **Service role client** (`createServerClient()`):
   - Uses `SUPABASE_SERVICE_ROLE_KEY` (private)
   - Bypasses RLS (admin access)
   - **Server-only** (API routes, Astro frontmatter)

**Usage:**
```typescript
// In Astro components (server-side)
import { supabase } from '@/lib/supabase';
const { data } = await supabase.from('lobbyists').select('*');

// In API routes (server-side with admin access)
import { createServerClient } from '@/lib/supabase';
const supabase = createServerClient();
```

**Database schema highlights:**
- **7 tables:** users, cities, subject_areas, lobbyists, clients, favorites, page_views
- **Full-text search:** `search_lobbyists()` function with ranking, uses `tsvector` + GIN indexes
- **RLS enabled** on all tables for security
- **Type safety:** Auto-generated types in `src/lib/database.types.ts`

### Styling: Tailwind CSS + shadcn/ui

- **Design system:** Texas Blue (#003f87) primary color, responsive utilities
- **Component pattern:** Copy-paste shadcn/ui components (not npm dependency)
- **Utility:** `cn()` function merges Tailwind classes with conflict resolution

```typescript
import { cn } from '@/lib/utils';
<div className={cn("base-classes", conditionalClasses)} />
```

### SSR Configuration

**Output mode:** Server-side rendering (not static)
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'server',        // SSR mode
  adapter: netlify(),      // Netlify serverless functions
});
```

**Why SSR:** Dynamic content (lobbyist profiles), SEO critical, page view tracking.

## Project Structure & Import Paths

```
src/
├── components/
│   ├── astro/       # Static server-rendered (Layout.astro, Header.astro, Footer.astro, SEO.astro)
│   ├── react/       # Interactive islands (SearchFilter.tsx)
│   └── ui/          # shadcn/ui primitives (button.tsx, input.tsx)
├── lib/
│   ├── supabase.ts           # Database clients (public + server)
│   ├── database.types.ts     # Generated TypeScript types
│   ├── utils.ts              # Utilities (cn, slugify, formatPhone, pluralize)
│   ├── api/                  # API helpers (not yet implemented)
│   └── schemas/              # Zod validation schemas (not yet implemented)
├── pages/
│   ├── index.astro           # Homepage (complete)
│   ├── lobbyists/            # Directory pages (not yet implemented)
│   └── api/                  # API routes (not yet implemented)
└── styles/
    └── globals.css           # Tailwind + CSS variables
```

**Import alias:** `@/*` maps to `src/*`
```typescript
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
```

## Data Layer Patterns

### Server-side data fetching (Astro components)

```astro
---
// Frontmatter runs server-side (build time or request time)
const { data: lobbyists } = await supabase
  .from('lobbyists')
  .select('*')
  .eq('is_active', true)
  .order('last_name');
---

<div>
  {lobbyists?.map(lobbyist => <Card {...lobbyist} />)}
</div>
```

### Full-text search pattern

```typescript
// Use the custom search_lobbyists() Postgres function
const { data } = await supabase.rpc('search_lobbyists', {
  search_query: 'healthcare',
  city_filters: ['Austin', 'Dallas'],
  subject_filters: ['Healthcare', 'Energy'],
  tier_filter: null,
  limit_count: 20,
  offset_count: 0
});
```

**Search ranking logic:**
1. Subscription tier (Featured > Premium > Free)
2. Text relevance score
3. View count
4. Last name alphabetical

### Type safety pattern

```typescript
import type { Database } from '@/lib/database.types';

// Tables
type Lobbyist = Database['public']['Tables']['lobbyists']['Row'];
type LobbyistInsert = Database['public']['Tables']['lobbyists']['Insert'];
type LobbyistUpdate = Database['public']['Tables']['lobbyists']['Update'];

// Enums
type SubscriptionTier = Database['public']['Enums']['subscription_tier'];
type UserRole = Database['public']['Enums']['user_role'];
```

## Environment Variables

**Public variables** (safe for client-side, prefix with `PUBLIC_`):
```bash
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_ANON_KEY=
PUBLIC_STRIPE_PUBLISHABLE_KEY=
PUBLIC_SITE_URL=
```

**Private variables** (server-only, NO PUBLIC_ prefix):
```bash
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
RESEND_API_KEY=
STRIPE_PREMIUM_PRICE_ID=
STRIPE_FEATURED_PRICE_ID=
```

**Access in code:**
```typescript
import.meta.env.PUBLIC_SUPABASE_URL     // Available everywhere
import.meta.env.SUPABASE_SERVICE_ROLE_KEY  // Server-only
```

## State Management

**Current approach:** No global state yet (Zustand installed but unused).

- **URL state:** Query parameters for search/filters
- **Local state:** React `useState` for form inputs
- **Server state:** Supabase queries in Astro frontmatter

**Future pattern (when needed):**
```typescript
// src/lib/stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({ ... }));
```

## Key Integrations

### Stripe (not yet implemented)

**Expected pattern:**
- Client-side: Checkout UI with `@stripe/stripe-js`
- Server-side: Payment processing, subscription management
- Webhook: `/api/stripe/webhook` for subscription updates
- Product tiers: Premium ($297/mo), Featured ($597/mo)

### Resend (not yet implemented)

**Expected usage:**
- Transactional emails (welcome, receipts, notifications)
- Profile claim verification
- Password reset flows

### Authentication (not yet implemented, planned Week 3)

**Expected Supabase Auth pattern:**
```typescript
// API route: src/pages/api/auth/callback.ts
export const GET: APIRoute = async ({ cookies, redirect }) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    cookies.set('sb-access-token', session.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax'
    });
    return redirect('/dashboard');
  }
  return redirect('/login');
};
```

## Utility Functions

**File:** `src/lib/utils.ts`

- `cn(...inputs)` - Merge Tailwind classes with conflict resolution (clsx + tailwind-merge)
- `slugify(text)` - Convert text to URL-safe slug ("John Doe" → "john-doe")
- `formatPhone(phone)` - Format US phone numbers ("5125550100" → "(512) 555-0100")
- `pluralize(count, singular, plural?)` - Smart pluralization

## Naming Conventions

- **Astro components:** PascalCase.astro (`Layout.astro`, `Header.astro`)
- **React components:** PascalCase.tsx (`SearchFilter.tsx`)
- **Utility functions:** camelCase (`slugify`, `formatPhone`)
- **Database tables:** snake_case (`lobbyists`, `subject_areas`)
- **TypeScript types:** PascalCase (`Database`, `LobbyistInsert`)

## Database Import Script

**File:** `scripts/import-lobbyists.ts`

Imports 1,687 Texas lobbyist records from CSV. Handles batch processing (50 records at a time), slug generation, array parsing for cities/subject_areas.

**CSV format:**
```csv
FirstName,LastName,Email,Phone,Cities,SubjectAreas
John,Doe,john@example.com,512-555-0100,Austin;Dallas,Healthcare;Energy
```

**Usage:** `npx tsx scripts/import-lobbyists.ts`

## Implementation Status

### ✅ Completed (Week 1)
- Database schema with RLS and full-text search
- Supabase integration with type-safe clients
- Homepage with hero, search, featured listings
- Layout system (Header, Footer, SEO)
- Styling system (Tailwind + shadcn/ui + custom CSS)
- CSV import script for lobbyist data

### 🔄 Partially Implemented
- Mobile navigation (button exists, drawer not built)
- Responsive design (layout responsive, page components pending)

### ❌ Not Yet Implemented (Weeks 2-4)
- Search results page (`/lobbyists`)
- Profile pages (`/lobbyists/[slug]`)
- Authentication (login, signup, session management)
- API routes (auth, payments, profile management)
- Stripe integration (checkout, subscriptions, webhooks)
- Email system (Resend integration)
- Lobbyist dashboard (profile editing)
- Zustand stores (auth, search state)
- City landing pages (SEO)
- Subject landing pages (SEO)

## Architectural Decisions

### Why Islands Architecture?
- **Performance:** Ship only essential JavaScript (currently ~50KB for SearchFilter)
- **SEO:** Static HTML for content, JavaScript only for interactivity
- **Flexibility:** Use React where needed, Astro for everything else

### Why Server-Side Rendering?
- **Dynamic content:** Lobbyist profiles change frequently
- **SEO critical:** Organic search is primary traffic source
- **Analytics:** Track page views server-side
- **Performance:** Better than client-side rendering for content-heavy pages

### Why Two Supabase Clients?
- **Security:** Public client respects RLS, service role bypasses for admin operations
- **Separation:** Clear boundary between client-safe and server-only operations
- **Type safety:** Both clients use same generated types

## Working with This Codebase

### Adding a new React island component

1. Create component in `src/components/react/`
2. Add hydration directive in Astro page: `<Component client:load />`
3. Pass server-fetched data as props from Astro frontmatter

### Adding a new API route

1. Create file in `src/pages/api/` (e.g., `auth/login.ts`)
2. Export HTTP methods as functions:
```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  // Handle request
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
```

### Adding a new database query

1. Use existing Supabase client (public or server)
2. TypeScript will auto-complete table names and columns
3. For complex queries, consider creating a Postgres function in migrations

### Adding a new page

1. Create `.astro` file in `src/pages/`
2. Use `<Layout>` component for consistent structure
3. Fetch data in frontmatter with `await supabase.from(...).select(...)`
4. Add SEO props to Layout (title, description, schema)

## Performance Targets

**Lighthouse Score Goal:** 90+ across all metrics

**Current optimizations:**
- Minimal JavaScript (islands architecture)
- Static HTML for content sections
- Database indexes (GIN on arrays, tsvector for search)
- Font optimization (preconnect, display swap)

**Future optimizations (Week 4):**
- Image optimization (Astro Image, WebP, lazy loading)
- Code splitting (route-based, component lazy loading)
- CDN caching (Netlify, stale-while-revalidate)

## Additional Context

**Product documentation:** See `PRIMARY AUDIENCE SEGMENTS.md` for complete specifications.

**Design framework:** Uses StoryBrand messaging framework (hero message, problem/solution sections).

**SEO strategy:**
- Schema.org JSON-LD on all pages
- City-specific landing pages (planned)
- Subject area landing pages (planned)
- Transparent lobbyist profiles for trust/backlinks
