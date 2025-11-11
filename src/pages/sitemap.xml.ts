import type { APIRoute } from 'astro';
import { supabase } from '@/lib/supabase';
import { INDUSTRY_SLUGS } from '@/lib/industries-data';
import { STATIC_ROUTES } from '@/lib/sitemap-config';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site?.toString() || 'https://texaslobby.org';

  // Static pages from centralized config
  const staticPages = STATIC_ROUTES;

  // Industry pages (from static data)
  const industryPages = INDUSTRY_SLUGS.map(slug => ({
    url: `industries/${slug}`,
    priority: '0.8',
    changefreq: 'weekly',
  }));

  // Fetch all active lobbyists
  const { data: lobbyists } = await supabase
    .from('lobbyists')
    .select('slug, updated_at')
    .eq('is_active', true)
    .order('slug')
    .limit(10000); // Override default 1000 limit

  const lobbyistPages = (lobbyists || []).map(lobbyist => ({
    url: `lobbyists/${lobbyist.slug}`,
    lastmod: lobbyist.updated_at ? new Date(lobbyist.updated_at).toISOString().split('T')[0] : undefined,
    priority: '0.7',
    changefreq: 'weekly',
  }));

  // Fetch all subject areas
  const { data: subjects } = await supabase
    .from('subject_areas')
    .select('slug')
    .order('slug')
    .limit(10000); // Override default 1000 limit

  const subjectPages = (subjects || []).map(subject => ({
    url: `subjects/${subject.slug}`,
    priority: '0.7',
    changefreq: 'weekly',
  }));

  // Fetch all cities
  const { data: cities } = await supabase
    .from('cities')
    .select('slug')
    .order('slug')
    .limit(10000); // Override default 1000 limit

  const cityPages = (cities || []).map(city => ({
    url: `cities/${city.slug}`,
    priority: '0.6',
    changefreq: 'weekly',
  }));

  // Auto-discover guide pages from file system
  const guidesDir = join(process.cwd(), 'src/pages/guides');
  let guidePages: any[] = [];
  try {
    const guideFiles = await readdir(guidesDir);
    guidePages = guideFiles
      .filter(file => file.endsWith('.astro') && file !== 'index.astro')
      .map(file => ({
        url: `guides/${file.replace('.astro', '')}`,
        priority: '0.7',
        changefreq: 'monthly',
      }));
  } catch (error) {
    console.error('Error reading guides directory:', error);
  }

  // Auto-discover blog posts from file system
  const blogDir = join(process.cwd(), 'src/pages/blog');
  let blogPages: any[] = [];
  try {
    const blogFiles = await readdir(blogDir);
    blogPages = blogFiles
      .filter(file => file.endsWith('.astro') && file !== 'index.astro')
      .map(file => ({
        url: `blog/${file.replace('.astro', '')}`,
        priority: '0.7',
        changefreq: 'monthly',
      }));
  } catch (error) {
    console.error('Error reading blog directory:', error);
  }

  // Combine all pages
  const allPages = [
    ...staticPages,
    ...industryPages,
    ...lobbyistPages,
    ...subjectPages,
    ...cityPages,
    ...guidePages,
    ...blogPages,
  ];

  // Generate XML
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages
  .map(
    page => `  <url>
    <loc>${siteUrl}${page.url}</loc>${
      page.lastmod ? `\n    <lastmod>${page.lastmod}</lastmod>` : ''
    }
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
};
