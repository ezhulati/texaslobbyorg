# Quickstart Guide: Browse by Clients Directory

**Feature**: 001-clients-directory
**Date**: 2025-11-11
**Target Audience**: Developers implementing this feature

## Overview

This guide will help you set up, develop, and test the Browse by Clients Directory feature. The feature adds two new pages to TexasLobby.org:

1. **`/clients`** - Directory listing all companies/organizations with active lobbyist representation
2. **`/clients/[slug]`** - Individual client detail page showing full lobbyist roster

**Architecture**: Astro SSR pages with React islands for filtering/sorting, backed by Postgres aggregation functions.

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 20+ and npm installed
- ✅ Supabase CLI installed (`npm install -g supabase`)
- ✅ Local development environment configured (`.env` file with Supabase credentials)
- ✅ Database seeded with lobbyist and client data (run `npm run db:setup` if needed)

### Required Environment Variables

```bash
# Public (client-safe)
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Private (server-only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Step 1: Database Migration

### 1.1 Create Migration File

Create a new migration in `supabase/migrations/`:

```bash
# Generate timestamp-based filename
TIMESTAMP=$(date +%Y%m%d%H%M%S)
touch supabase/migrations/${TIMESTAMP}_add_client_aggregation_functions.sql
```

### 1.2 Copy Postgres Functions

Copy the SQL from the contracts files into your migration:

```bash
cat specs/001-clients-directory/contracts/get_clients_directory.sql >> supabase/migrations/${TIMESTAMP}_add_client_aggregation_functions.sql
echo "\n\n" >> supabase/migrations/${TIMESTAMP}_add_client_aggregation_functions.sql
cat specs/001-clients-directory/contracts/get_client_detail.sql >> supabase/migrations/${TIMESTAMP}_add_client_aggregation_functions.sql
```

### 1.3 Run Migration

```bash
# Push to local Supabase (if running locally)
supabase db push

# OR push to remote Supabase
supabase db push --remote
```

### 1.4 Regenerate TypeScript Types

```bash
# Generate updated database.types.ts with new functions
supabase gen types typescript --local > src/lib/database.types.ts

# OR for remote
supabase gen types typescript --project-id your-project-id > src/lib/database.types.ts
```

**Verify**: Check that `database.types.ts` now includes:
- `get_clients_directory` in the `Functions` section
- `get_client_detail` in the `Functions` section

---

## Step 2: Create API Helper Functions

### 2.1 Create `src/lib/api/clients.ts`

```typescript
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

// Type definitions
export interface ClientSummary {
  name: string;
  slug: string;
  lobbyist_count: number;
  subject_areas: string[];
  top_subject_areas: string[];
}

export interface ClientSearchParams {
  sort?: 'lobbyist_count_desc' | 'lobbyist_count_asc' | 'name_asc' | 'name_desc';
  subjects?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Search clients with filters and sorting
 */
export async function searchClients(params: ClientSearchParams): Promise<ClientSummary[]> {
  const { sort = 'lobbyist_count_desc', subjects, limit = 50, offset = 0 } = params;

  // Convert subject slugs to names (if provided)
  let subjectNames: string[] | null = null;
  if (subjects && subjects.length > 0) {
    const { data: subjectData } = await supabase
      .from('subject_areas')
      .select('name')
      .in('slug', subjects);
    subjectNames = subjectData ? subjectData.map(s => s.name) : null;
  }

  const { data, error } = await (supabase.rpc as any)('get_clients_directory', {
    sort_by: sort,
    subject_filters: subjectNames,
    limit_count: limit,
    offset_count: offset,
  });

  if (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }

  return data as ClientSummary[];
}

/**
 * Get a single client by slug with paginated lobbyists
 */
export async function getClientBySlug(slug: string, lobbyistLimit = 20, lobbyistOffset = 0) {
  const { data, error } = await (supabase.rpc as any)('get_client_detail', {
    client_slug_param: slug,
    lobbyist_limit: lobbyistLimit,
    lobbyist_offset: lobbyistOffset,
  });

  if (error) {
    console.error('Error fetching client:', error);
    return null;
  }

  // Postgres function returns an array with 1 result or empty array
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Get total count of clients (for pagination)
 */
export async function getClientCount(params: ClientSearchParams): Promise<number> {
  const { subjects } = params;

  // Convert subject slugs to names
  let subjectNames: string[] | null = null;
  if (subjects && subjects.length > 0) {
    const { data: subjectData } = await supabase
      .from('subject_areas')
      .select('name')
      .in('slug', subjects);
    subjectNames = subjectData ? subjectData.map(s => s.name) : null;
  }

  // Get full list to count (no pagination)
  const { data, error } = await (supabase.rpc as any)('get_clients_directory', {
    sort_by: 'lobbyist_count_desc',
    subject_filters: subjectNames,
    limit_count: 10000, // Large enough to get all clients
    offset_count: 0,
  });

  if (error) {
    console.error('Error counting clients:', error);
    return 0;
  }

  return data ? data.length : 0;
}
```

---

## Step 3: Create Pages

### 3.1 Create Clients Directory Page

**File**: `src/pages/clients/index.astro`

```astro
---
import Layout from '@/components/astro/Layout.astro';
import ClientCard from '@/components/astro/ClientCard.astro';
import ClientsFilter from '@/components/react/ClientsFilter';
import { supabase } from '@/lib/supabase';
import { searchClients, getClientCount } from '@/lib/api/clients';

// Get search parameters from URL
const url = new URL(Astro.request.url);
const subjectFilter = url.searchParams.get('subject') || '';
const sortBy = url.searchParams.get('sort') || 'lobbyist_count_desc';
const page = parseInt(url.searchParams.get('page') || '1');
const perPage = 50;

// Fetch subject areas for filter
const { data: subjectAreas } = await supabase
  .from('subject_areas')
  .select('id, name, slug')
  .order('name')
  .limit(10000);

// Build search parameters
const searchParams = {
  sort: sortBy as any,
  subjects: subjectFilter ? [subjectFilter] : undefined,
  limit: perPage,
  offset: (page - 1) * perPage,
};

// Search clients
const clients = await searchClients(searchParams);
const totalCount = await getClientCount(searchParams);
const totalPages = Math.ceil(totalCount / perPage);

// SEO
const pageTitle = 'Browse Texas Lobbyist Clients | Company Directory';
const pageDescription = `Discover which ${totalCount}+ companies are represented by Texas lobbyists. Explore by industry, compare lobbying activity, find advocates through their client lists.`;

// Schema markup
const schema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: clients.map((client, index) => ({
    '@type': 'ListItem',
    position: (page - 1) * perPage + index + 1,
    item: {
      '@type': 'Organization',
      name: client.name,
      url: `https://texaslobby.org/clients/${client.slug}`,
    },
  })),
  numberOfItems: totalCount,
};
---

<Layout
  title={pageTitle}
  description={pageDescription}
  schema={schema}
>
  <!-- Page content here -->
  <section class="bg-gradient-to-b from-texas-blue-500/5 to-background py-12 border-b border-border">
    <div class="container">
      <h1 class="text-3xl md:text-4xl font-bold mb-2">Browse by Clients</h1>
      <p class="text-lg text-muted-foreground mb-6">
        {totalCount.toLocaleString()} companies represented by Texas lobbyists
      </p>

      <!-- TODO: Add ClientsFilter component -->
    </div>
  </section>

  <!-- Results -->
  <section class="py-12">
    <div class="container">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <ClientCard client={client} />
        ))}
      </div>

      <!-- TODO: Add pagination -->
    </div>
  </section>
</Layout>
```

### 3.2 Create Client Detail Page

**File**: `src/pages/clients/[slug].astro`

```astro
---
import Layout from '@/components/astro/Layout.astro';
import { getClientBySlug } from '@/lib/api/clients';

const { slug } = Astro.params;
const client = await getClientBySlug(slug!, 20, 0);

if (!client) {
  return Astro.redirect('/404');
}

// Schema markup
const schema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: client.name,
  url: `https://texaslobby.org/clients/${client.slug}`,
  description: `Represented by ${client.lobbyist_count} Texas lobbyists`,
  knowsAbout: client.subject_areas,
};
---

<Layout
  title={`${client.name} - Texas Lobbyist Clients`}
  description={`${client.name} is represented by ${client.lobbyist_count} Texas lobbyists specializing in ${client.subject_areas.slice(0, 3).join(', ')}.`}
  schema={schema}
>
  <!-- Client detail page content -->
  <section class="py-12">
    <div class="container">
      <h1 class="text-4xl font-bold mb-4">{client.name}</h1>
      <p class="text-lg text-muted-foreground mb-6">
        Represented by {client.lobbyist_count} lobbyists
      </p>

      <!-- Subject areas -->
      <div class="flex flex-wrap gap-2 mb-8">
        {client.subject_areas.map(subject => (
          <span class="inline-flex items-center rounded-full bg-texas-blue-500/10 px-3 py-1 text-sm">
            {subject}
          </span>
        ))}
      </div>

      <!-- Lobbyist list -->
      <h2 class="text-2xl font-bold mb-6">Lobbyists</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {client.lobbyists.results.map((lobbyist: any) => (
          <a href={`/lobbyists/${lobbyist.slug}`} class="block">
            <!-- Lobbyist card -->
            <div class="border rounded-lg p-4 hover:shadow-lg transition-shadow">
              <p class="font-semibold">{lobbyist.first_name} {lobbyist.last_name}</p>
              <p class="text-sm text-muted-foreground">{lobbyist.subscription_tier}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  </section>
</Layout>
```

---

## Step 4: Create Components

### 4.1 Create ClientCard Component

**File**: `src/components/astro/ClientCard.astro`

```astro
---
interface Props {
  client: {
    name: string;
    slug: string;
    lobbyist_count: number;
    top_subject_areas: string[];
  };
}

const { client } = Astro.props;
---

<a href={`/clients/${client.slug}`} class="block" data-testid="client-card">
  <div class="border rounded-lg p-6 hover:shadow-lg transition-shadow">
    <h3 class="text-xl font-bold mb-2">{client.name}</h3>
    <p class="text-muted-foreground mb-4" data-testid="lobbyist-count">
      {client.lobbyist_count} {client.lobbyist_count === 1 ? 'lobbyist' : 'lobbyists'}
    </p>

    <!-- Subject areas -->
    <div class="flex flex-wrap gap-2">
      {client.top_subject_areas.slice(0, 3).map(subject => (
        <span class="inline-flex items-center rounded-full bg-texas-blue-500/10 px-3 py-1 text-sm">
          {subject}
        </span>
      ))}
      {client.top_subject_areas.length > 3 && (
        <span class="inline-flex items-center rounded-full bg-muted px-3 py-1 text-sm">
          +{client.top_subject_areas.length - 3} more
        </span>
      )}
    </div>
  </div>
</a>
```

### 4.2 Create ClientsFilter Component

**File**: `src/components/react/ClientsFilter.tsx`

```typescript
// TODO: Implement similar to SearchFilter.tsx
// - Multi-select subject area dropdown
// - Sort dropdown (lobbyist count, alphabetical)
// - Clear filters button
// - Updates URL on change (triggers page reload)
```

---

## Step 5: Development Workflow

### 5.1 Start Development Server

```bash
npm run dev
```

Navigate to:
- **Directory**: http://localhost:4321/clients
- **Detail page**: http://localhost:4321/clients/att (or any client slug)

### 5.2 Test Database Functions Directly

Use Supabase Studio or `psql` to test:

```sql
-- Test directory function
SELECT * FROM get_clients_directory('lobbyist_count_desc', NULL, 10, 0);

-- Test detail function
SELECT * FROM get_client_detail('att', 5, 0);

-- Verify slug uniqueness
SELECT slug, COUNT(*) FROM get_clients_directory()
GROUP BY slug HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

### 5.3 Query Performance Analysis

```sql
EXPLAIN ANALYZE
SELECT * FROM get_clients_directory('lobbyist_count_desc', ARRAY['Healthcare'], 50, 0);
```

Look for:
- ❌ Sequential scans on large tables
- ❌ High execution time (>100ms)
- ✅ Index usage on `clients.lobbyist_id`, `lobbyists.subject_areas`

---

## Step 6: Testing

### 6.1 Create E2E Tests

**File**: `tests/e2e/clients-directory.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test('clients directory loads and displays clients', async ({ page }) => {
  await page.goto('/clients');

  // Check page title
  await expect(page.locator('h1')).toContainText('Browse by Clients');

  // Check that client cards are rendered
  const clientCards = page.locator('[data-testid="client-card"]');
  await expect(clientCards).toHaveCountGreaterThan(0);

  // Check first client has lobbyist count
  const firstCard = clientCards.first();
  await expect(firstCard.locator('[data-testid="lobbyist-count"]')).toBeVisible();
});

test('clients are sorted by lobbyist count by default', async ({ page }) => {
  await page.goto('/clients');

  const counts = await page.locator('[data-testid="lobbyist-count"]').allTextContents();
  const numbers = counts.map(c => parseInt(c.match(/\d+/)?.[0] || '0'));

  // Verify descending order
  for (let i = 0; i < numbers.length - 1; i++) {
    expect(numbers[i]).toBeGreaterThanOrEqual(numbers[i + 1]);
  }
});

test('clicking client navigates to detail page', async ({ page }) => {
  await page.goto('/clients');

  const firstClient = page.locator('[data-testid="client-card"]').first();
  await firstClient.click();

  // Should navigate to /clients/[slug]
  await expect(page).toHaveURL(/\/clients\/[a-z0-9-]+/);

  // Should show lobbyist list
  await expect(page.locator('h2')).toContainText('Lobbyists');
});
```

### 6.2 Run Tests

```bash
npx playwright test tests/e2e/clients-directory.spec.ts
```

---

## Step 7: Integration Checklist

Before marking this feature complete, verify:

- [ ] Migration applied successfully (check Supabase logs)
- [ ] TypeScript types regenerated and committed
- [ ] Both pages (`/clients`, `/clients/[slug]`) render without errors
- [ ] Filtering by subject area works correctly
- [ ] Sorting options work correctly (count, alphabetical)
- [ ] Pagination works correctly (Previous/Next buttons)
- [ ] Schema.org markup validates (use Google Rich Results Test)
- [ ] E2E tests pass
- [ ] Performance meets targets (<2s page load, <500ms filter operations)
- [ ] Mobile responsive design works
- [ ] Accessibility: keyboard navigation, screen reader labels

---

## Troubleshooting

### Issue: "Function get_clients_directory does not exist"

**Solution**: Run the migration and verify it was applied:

```bash
supabase db push
supabase gen types typescript --local > src/lib/database.types.ts
```

### Issue: Client slug not found (404 on detail page)

**Solution**: Check that the slug is being computed correctly:

```sql
SELECT
  name,
  lower(regexp_replace(
    regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  )) AS computed_slug
FROM clients
LIMIT 10;
```

### Issue: Duplicate slugs in directory

**Solution**: This means multiple clients have names that produce the same slug. Add numeric suffix logic to the Postgres function.

### Issue: Slow page load (>2 seconds)

**Solution**: Run `EXPLAIN ANALYZE` on the Postgres function and add indexes:

```sql
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_is_current ON clients(is_current);
```

---

## Next Steps

After completing this feature:

1. **Run `/speckit.tasks`** to generate detailed implementation tasks
2. **Run `/speckit.implement`** to execute the tasks
3. **Deploy** to staging environment for UAT
4. **Monitor** performance metrics (page load, filter speed)
5. **Iterate** based on user feedback and analytics (SC-003, SC-007)

---

## References

- **Feature Spec**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Contracts**: [contracts/](./contracts/)
- **Astro Docs**: https://docs.astro.build
- **Supabase Docs**: https://supabase.com/docs
- **CLAUDE.md**: Project-level guidance for this codebase

---

**Quickstart Status**: ✅ **COMPLETE**

You're ready to start implementing! Run `/speckit.tasks` to generate the task breakdown.
