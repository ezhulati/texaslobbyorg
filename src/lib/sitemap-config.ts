/**
 * Sitemap Configuration
 *
 * Add new static routes here when you create new sections like /reports, /guides, etc.
 * The sitemap will automatically include them.
 */

export interface SitemapRoute {
  url: string;
  priority: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

/**
 * Static pages and directory indexes
 * Add new top-level pages here as you create them
 */
export const STATIC_ROUTES: SitemapRoute[] = [
  // Core pages (highest priority)
  { url: '', priority: '1.0', changefreq: 'daily' }, // Homepage
  { url: 'lobbyists', priority: '0.9', changefreq: 'daily' },

  // Directory pages
  { url: 'industries', priority: '0.8', changefreq: 'weekly' },
  { url: 'subjects', priority: '0.8', changefreq: 'weekly' },
  { url: 'cities', priority: '0.8', changefreq: 'weekly' },
  { url: 'guides', priority: '0.8', changefreq: 'weekly' },
  { url: 'blog', priority: '0.8', changefreq: 'weekly' },

  // Content pages
  { url: 'reports/2025', priority: '0.8', changefreq: 'monthly' },

  // Note: Individual guides and blog posts are now auto-discovered from file system
  // No need to manually add them here - see sitemap.xml.ts

  // Add new sections here as you create them:
  // { url: 'about', priority: '0.6', changefreq: 'monthly' },
];

/**
 * Priority guide:
 * 1.0 - Homepage
 * 0.9 - Main directory/listing pages
 * 0.8 - Category/industry pages, important static content
 * 0.7 - Individual profiles, subject pages
 * 0.6 - Secondary pages (cities, about, etc.)
 * 0.5 - Tertiary content
 *
 * Change frequency guide:
 * 'always'  - Changes every time accessed (rarely used)
 * 'hourly'  - Updated multiple times per day
 * 'daily'   - Updated once per day or more
 * 'weekly'  - Updated weekly
 * 'monthly' - Updated monthly
 * 'yearly'  - Updated yearly
 * 'never'   - Archived content that won't change
 */
