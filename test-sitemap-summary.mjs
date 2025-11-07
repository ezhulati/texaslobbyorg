import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== TEXASLOBBY.ORG SITEMAP SUMMARY ===\n');

// Static pages
console.log('STATIC PAGES (Priority: 0.8-1.0):');
console.log('  / (Homepage)');
console.log('  /lobbyists');
console.log('  /industries');
console.log('  /subjects');
console.log('  /cities\n');

// Industry pages
console.log('INDUSTRY PAGES (5 pages, Priority: 0.8):');
const industries = ['energy-utilities', 'healthcare-insurance', 'gaming-casinos', 'technology-telecom', 'local-government'];
industries.forEach(slug => console.log(`  /industries/${slug}`));
console.log('');

// Lobbyists
const { data: lobbyists } = await supabase
  .from('lobbyists')
  .select('slug')
  .eq('is_active', true)
  .limit(3);

const { count: lobbyistCount } = await supabase
  .from('lobbyists')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true);

console.log(`LOBBYIST PAGES (${lobbyistCount || 0} pages, Priority: 0.7):`);
if (lobbyists && lobbyists.length > 0) {
  console.log(`  /lobbyists/[slug] (${lobbyistCount} active profiles)`);
  console.log(`  Examples: /lobbyists/${lobbyists[0].slug}, /lobbyists/${lobbyists[1].slug}...`);
}
console.log('');

// Subjects
const { data: subjects } = await supabase
  .from('subject_areas')
  .select('slug')
  .limit(3);

const { count: subjectCount } = await supabase
  .from('subject_areas')
  .select('*', { count: 'exact', head: true });

console.log(`SUBJECT PAGES (${subjectCount || 0} pages, Priority: 0.7):`);
if (subjects && subjects.length > 0) {
  console.log(`  /subjects/[slug] (${subjectCount} subject areas)`);
  console.log(`  Examples: /subjects/${subjects[0].slug}, /subjects/${subjects[1].slug}...`);
}
console.log('');

// Cities
const { data: cities } = await supabase
  .from('cities')
  .select('slug')
  .limit(3);

const { count: cityCount } = await supabase
  .from('cities')
  .select('*', { count: 'exact', head: true });

console.log(`CITY PAGES (${cityCount || 0} pages, Priority: 0.6):`);
if (cities && cities.length > 0) {
  console.log(`  /cities/[slug] (${cityCount} cities)`);
  console.log(`  Examples: /cities/${cities[0].slug}, /cities/${cities[1].slug}...`);
}
console.log('');

// Total
const total = 5 + 5 + (lobbyistCount || 0) + (subjectCount || 0) + (cityCount || 0);
console.log(`TOTAL INDEXABLE PAGES: ${total}`);
console.log('\nEXCLUDED FROM SITEMAP:');
console.log('  /dashboard (authenticated)');
console.log('  /dashboard/* (authenticated)');
console.log('  /api/* (API endpoints)');
console.log('  /create-profile (authenticated)');
console.log('  /reset-password (authenticated)');
console.log('  /login (utility page)');
console.log('  /signup (utility page)');
console.log('\nSitemap available at: https://texaslobby.org/sitemap.xml');
console.log('Robots.txt available at: https://texaslobby.org/robots.txt');
