import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types';
import { INDUSTRY_SLUGS } from '../src/lib/industries-data';
import { STATIC_ROUTES } from '../src/lib/sitemap-config';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function verifySitemapCount() {
  console.log('\n=== Sitemap Page Count Breakdown ===\n');

  // 1. Static pages
  const staticCount = STATIC_ROUTES.length;
  console.log(`Static pages: ${staticCount}`);
  console.log(`  (homepage, about, contact, login, signup, etc.)\n`);

  // 2. Industry pages
  const industryCount = INDUSTRY_SLUGS.length;
  console.log(`Industry pages: ${industryCount}`);
  console.log(`  (from INDUSTRY_SLUGS constant)\n`);

  // 3. Lobbyist pages (APPROVED only)
  const { data: approvedLobbyists, count: approvedCount } = await supabase
    .from('lobbyists')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .eq('approval_status', 'approved');

  console.log(`Approved lobbyist pages: ${approvedCount || 0}`);

  // Show breakdown by status
  const { data: allLobbyists } = await supabase
    .from('lobbyists')
    .select('approval_status, is_active')
    .eq('is_active', true);

  const statusBreakdown = allLobbyists?.reduce((acc, l) => {
    acc[l.approval_status] = (acc[l.approval_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log(`  Breakdown of active lobbyists:`);
  Object.entries(statusBreakdown || {}).forEach(([status, count]) => {
    console.log(`    ${status}: ${count}`);
  });
  console.log();

  // 4. Subject area pages
  const { count: subjectCount } = await supabase
    .from('subject_areas')
    .select('*', { count: 'exact', head: true });

  console.log(`Subject area pages: ${subjectCount || 0}\n`);

  // 5. City pages
  const { count: cityCount } = await supabase
    .from('cities')
    .select('*', { count: 'exact', head: true });

  console.log(`City pages: ${cityCount || 0}\n`);

  // 6. Guide pages (approximate)
  console.log(`Guide pages: ~5-10 (estimated)\n`);

  // 7. Blog pages (approximate)
  console.log(`Blog pages: ~5-10 (estimated)\n`);

  // Total
  const estimatedTotal =
    staticCount +
    industryCount +
    (approvedCount || 0) +
    (subjectCount || 0) +
    (cityCount || 0) +
    10; // guides + blog estimate

  console.log('─'.repeat(40));
  console.log(`\nEstimated total pages: ~${estimatedTotal}`);
  console.log(`Google Search Console shows: 1,222\n`);

  if (Math.abs(estimatedTotal - 1222) < 50) {
    console.log('✅ Sitemap count looks correct!');
  } else {
    console.log('⚠️  Sitemap count may need investigation');
  }

  // Show what's excluded
  const { count: excludedCount } = await supabase
    .from('lobbyists')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
    .neq('approval_status', 'approved');

  console.log(`\n📊 Profiles excluded from sitemap: ${excludedCount || 0}`);
  console.log(`   (rejected or pending profiles that are active but not approved)\n`);
}

verifySitemapCount().catch(console.error);
