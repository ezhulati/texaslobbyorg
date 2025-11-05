import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function auditAllData() {
  console.log('='.repeat(80));
  console.log('COMPREHENSIVE DATA AUDIT');
  console.log('='.repeat(80));
  console.log();

  // Get all lobbyists
  const { data: lobbyists } = await supabase
    .from('lobbyists')
    .select('*')
    .eq('is_active', true);

  console.log(`Total active lobbyists: ${lobbyists?.length}\n`);

  // ============================================================================
  // 1. AUDIT CITIES
  // ============================================================================
  console.log('1. CITIES AUDIT');
  console.log('-'.repeat(80));

  const { data: cities } = await supabase
    .from('cities')
    .select('*')
    .order('name');

  // Count occurrences of each city in lobbyist data
  const cityCounts: Record<string, number> = {};
  lobbyists?.forEach((lobbyist) => {
    lobbyist.cities?.forEach((city: string) => {
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
  });

  console.log(`\nCities in database: ${cities?.length}`);
  console.log(`Unique cities in lobbyist data: ${Object.keys(cityCounts).length}\n`);

  // Check for cities with no lobbyists
  const citiesWithZero: string[] = [];
  cities?.forEach((city) => {
    const count = cityCounts[city.name] || 0;
    if (count === 0) {
      citiesWithZero.push(city.name);
    }
  });

  if (citiesWithZero.length > 0) {
    console.log(`❌ ${citiesWithZero.length} cities have no lobbyists:`);
    citiesWithZero.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log('✅ All cities in database have at least one lobbyist');
  }

  // Check for cities in lobbyist data that aren't in cities table
  const cityNamesInDB = new Set(cities?.map(c => c.name) || []);
  const citiesNotInDB = Object.keys(cityCounts).filter(name => !cityNamesInDB.has(name));

  if (citiesNotInDB.length > 0) {
    console.log(`\n⚠️  ${citiesNotInDB.length} cities in lobbyist data NOT in cities table:`);
    citiesNotInDB.slice(0, 10).forEach(name => {
      console.log(`   - "${name}" (${cityCounts[name]} lobbyists)`);
    });
    if (citiesNotInDB.length > 10) {
      console.log(`   ... and ${citiesNotInDB.length - 10} more`);
    }
  } else {
    console.log('\n✅ All cities in lobbyist data exist in cities table');
  }

  // ============================================================================
  // 2. AUDIT SUBJECT AREAS
  // ============================================================================
  console.log('\n\n2. SUBJECT AREAS AUDIT');
  console.log('-'.repeat(80));

  const { data: subjects } = await supabase
    .from('subject_areas')
    .select('*')
    .order('name');

  // Count occurrences of each subject in lobbyist data
  const subjectCounts: Record<string, number> = {};
  lobbyists?.forEach((lobbyist) => {
    lobbyist.subject_areas?.forEach((subject: string) => {
      subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
    });
  });

  console.log(`\nSubject areas in database: ${subjects?.length}`);
  console.log(`Unique subjects in lobbyist data: ${Object.keys(subjectCounts).length}\n`);

  // Check for subjects with no lobbyists
  const subjectsWithZero: string[] = [];
  subjects?.forEach((subject) => {
    const count = subjectCounts[subject.name] || 0;
    if (count === 0) {
      subjectsWithZero.push(subject.name);
    }
  });

  if (subjectsWithZero.length > 0) {
    console.log(`❌ ${subjectsWithZero.length} subjects have no lobbyists:`);
    subjectsWithZero.forEach(name => console.log(`   - ${name}`));
  } else {
    console.log('✅ All subjects in database have at least one lobbyist');
  }

  // Check for subjects in lobbyist data that aren't in subject_areas table
  const subjectNamesInDB = new Set(subjects?.map(s => s.name) || []);
  const subjectsNotInDB = Object.keys(subjectCounts).filter(name => !subjectNamesInDB.has(name));

  if (subjectsNotInDB.length > 0) {
    console.log(`\n⚠️  ${subjectsNotInDB.length} subjects in lobbyist data NOT in subject_areas table:`);
    subjectsNotInDB.slice(0, 15).forEach(name => {
      console.log(`   - "${name}" (${subjectCounts[name]} lobbyists)`);
    });
    if (subjectsNotInDB.length > 15) {
      console.log(`   ... and ${subjectsNotInDB.length - 15} more`);
    }
  } else {
    console.log('\n✅ All subjects in lobbyist data exist in subject_areas table');
  }

  // ============================================================================
  // 3. AUDIT DATA QUALITY
  // ============================================================================
  console.log('\n\n3. DATA QUALITY AUDIT');
  console.log('-'.repeat(80));

  let missingNames = 0;
  let missingSlugs = 0;
  let missingCities = 0;
  let missingSubjects = 0;
  let missingBios = 0;

  lobbyists?.forEach((lobbyist) => {
    if (!lobbyist.first_name || !lobbyist.last_name) missingNames++;
    if (!lobbyist.slug) missingSlugs++;
    if (!lobbyist.cities || lobbyist.cities.length === 0) missingCities++;
    if (!lobbyist.subject_areas || lobbyist.subject_areas.length === 0) missingSubjects++;
    if (!lobbyist.bio) missingBios++;
  });

  console.log('\nLobbyist Data Completeness:');
  console.log(`  ${missingNames === 0 ? '✅' : '⚠️ '} Missing names: ${missingNames}`);
  console.log(`  ${missingSlugs === 0 ? '✅' : '⚠️ '} Missing slugs: ${missingSlugs}`);
  console.log(`  ${missingCities === 0 ? '✅' : '⚠️ '} Missing cities: ${missingCities}`);
  console.log(`  ${missingSubjects === 0 ? '✅' : '⚠️ '} Missing subject areas: ${missingSubjects}`);
  console.log(`  ${missingBios === 0 ? '✅' : '⚠️ '} Missing bios: ${missingBios}`);

  // ============================================================================
  // 4. AUDIT SUBSCRIPTION TIERS
  // ============================================================================
  console.log('\n\n4. SUBSCRIPTION TIERS AUDIT');
  console.log('-'.repeat(80));

  const tierCounts = {
    free: lobbyists?.filter(l => l.subscription_tier === 'free').length || 0,
    premium: lobbyists?.filter(l => l.subscription_tier === 'premium').length || 0,
    featured: lobbyists?.filter(l => l.subscription_tier === 'featured').length || 0,
  };

  console.log('\nSubscription Tier Distribution:');
  console.log(`  Free:     ${tierCounts.free.toString().padStart(4)} (${((tierCounts.free / (lobbyists?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`  Premium:  ${tierCounts.premium.toString().padStart(4)} (${((tierCounts.premium / (lobbyists?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`  Featured: ${tierCounts.featured.toString().padStart(4)} (${((tierCounts.featured / (lobbyists?.length || 1)) * 100).toFixed(1)}%)`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('AUDIT SUMMARY');
  console.log('='.repeat(80));

  const issues: string[] = [];
  if (citiesWithZero.length > 0) issues.push(`${citiesWithZero.length} cities with no lobbyists`);
  if (citiesNotInDB.length > 0) issues.push(`${citiesNotInDB.length} cities in data but not in table`);
  if (subjectsWithZero.length > 0) issues.push(`${subjectsWithZero.length} subjects with no lobbyists`);
  if (subjectsNotInDB.length > 0) issues.push(`${subjectsNotInDB.length} subjects in data but not in table`);
  if (missingNames > 0) issues.push(`${missingNames} lobbyists with missing names`);
  if (missingSlugs > 0) issues.push(`${missingSlugs} lobbyists with missing slugs`);
  if (missingCities > 0) issues.push(`${missingCities} lobbyists with no cities`);
  if (missingSubjects > 0) issues.push(`${missingSubjects} lobbyists with no subjects`);

  if (issues.length === 0) {
    console.log('\n✅ NO ISSUES FOUND - All data is clean and consistent!');
  } else {
    console.log(`\n⚠️  FOUND ${issues.length} ISSUES:\n`);
    issues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }

  console.log('\n' + '='.repeat(80));
}

auditAllData();
