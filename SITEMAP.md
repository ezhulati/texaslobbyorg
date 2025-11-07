# Sitemap Management Guide

This document explains how to maintain the sitemap as you add new sections to TexasLobby.org.

## Overview

The sitemap is automatically generated at `/sitemap.xml` and includes:
- **2,047+ pages** (as of Nov 2024)
- Static pages (homepage, directories)
- Industry pages (5 pages)
- Lobbyist profiles (1,842+ pages)
- Subject pages (84 pages)
- City pages (111 pages)

## Adding New Static Pages

When you add new top-level pages or directories like `/reports`, `/guides`, `/blog`, etc:

1. **Open**: `src/lib/sitemap-config.ts`
2. **Add** your route to the `STATIC_ROUTES` array:

```typescript
export const STATIC_ROUTES: SitemapRoute[] = [
  // ... existing routes

  // Your new routes:
  { url: 'reports', priority: '0.8', changefreq: 'weekly' },
  { url: 'guides', priority: '0.8', changefreq: 'weekly' },
  { url: 'blog', priority: '0.7', changefreq: 'daily' },
];
```

That's it! The sitemap will automatically include these pages.

## Adding Database-Driven Sections

When you add new database tables with dynamic content (like reports, guides, articles):

1. **Open**: `src/pages/sitemap.xml.ts`
2. **Add** a query and mapping following the existing pattern:

```typescript
// Example: Adding /reports section
const { data: reports } = await supabase
  .from('reports')
  .select('slug, updated_at')
  .eq('is_published', true)
  .order('slug');

const reportPages = (reports || []).map(report => ({
  url: `reports/${report.slug}`,
  lastmod: report.updated_at ? new Date(report.updated_at).toISOString().split('T')[0] : undefined,
  priority: '0.7',
  changefreq: 'monthly',
}));
```

3. **Add** to the `allPages` array:

```typescript
const allPages = [
  ...staticPages,
  ...industryPages,
  ...lobbyistPages,
  ...subjectPages,
  ...cityPages,
  ...reportPages, // Add your new section here
];
```

## Priority Guidelines

Use these priorities to help search engines understand page importance:

| Priority | Use For | Examples |
|----------|---------|----------|
| `1.0` | Homepage only | `/` |
| `0.9` | Main listings/directories | `/lobbyists`, `/industries` |
| `0.8` | Category pages, important content | Industry pages, `/reports` |
| `0.7` | Individual profiles, articles | Lobbyist profiles, `/reports/[slug]` |
| `0.6` | Secondary pages | City pages, `/about` |
| `0.5` | Tertiary content | Archives, tags |

## Change Frequency Guidelines

| Frequency | Use When | Examples |
|-----------|----------|----------|
| `daily` | Content updates daily or more | Homepage, `/lobbyists` listing |
| `weekly` | Content updates weekly | Profile pages, industry pages |
| `monthly` | Content updates monthly | Report archives, guides |
| `yearly` | Rarely changes | About page, terms |
| `never` | Archived, won't change | Historical reports |

## Testing the Sitemap

After making changes:

```bash
# Build the project
npm run build

# Start dev server
npm run dev

# View sitemap
open http://localhost:4321/sitemap.xml
```

## Files to Know

- **`src/lib/sitemap-config.ts`** - Add static routes here
- **`src/pages/sitemap.xml.ts`** - Add database-driven sections here
- **`public/robots.txt`** - References the sitemap, blocks private pages

## Submitting to Search Engines

After deploying changes:

1. **Google Search Console**: Submit `https://texaslobby.org/sitemap.xml`
2. **Bing Webmaster Tools**: Submit the same URL
3. **Verify robots.txt**: Check `https://texaslobby.org/robots.txt`

The sitemap updates automatically on each request (cached for 1 hour), so search engines will discover new content as you add it.

## Common Scenarios

### Adding a Blog Section

1. Add directory page to `sitemap-config.ts`:
```typescript
{ url: 'blog', priority: '0.8', changefreq: 'daily' },
```

2. Add blog posts to `sitemap.xml.ts`:
```typescript
const { data: posts } = await supabase
  .from('blog_posts')
  .select('slug, updated_at')
  .eq('is_published', true);

const blogPages = (posts || []).map(post => ({
  url: `blog/${post.slug}`,
  lastmod: post.updated_at ? new Date(post.updated_at).toISOString().split('T')[0] : undefined,
  priority: '0.7',
  changefreq: 'monthly',
}));
```

3. Add to `allPages`: `...blogPages`

### Adding Static About Pages

Just add to `sitemap-config.ts`:
```typescript
{ url: 'about', priority: '0.6', changefreq: 'yearly' },
{ url: 'contact', priority: '0.6', changefreq: 'yearly' },
{ url: 'privacy', priority: '0.5', changefreq: 'yearly' },
```

## Questions?

See `src/pages/sitemap.xml.ts` for examples or reference the existing sections (lobbyists, subjects, cities, industries).
