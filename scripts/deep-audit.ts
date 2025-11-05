import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function deepAudit() {
  console.log('='.repeat(80));
  console.log('DEEP DATA AUDIT');
  console.log('='.repeat(80));
  console.log();

  const { data: lobbyists } = await supabase
    .from('lobbyists')
    .select('*')
    .eq('is_active', true);

  const { data: cities } = await supabase.from('cities').select('*');
  const { data: subjects } = await supabase.from('subject_areas').select('*');

  // ============================================================================
  // 1. SLUG UNIQUENESS AND FORMAT
  // ============================================================================
  console.log('1. SLUG ANALYSIS');
  console.log('-'.repeat(80));

  const slugs = new Set<string>();
  const duplicateSlugs: string[] = [];
  const invalidSlugs: string[] = [];
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  lobbyists?.forEach((l) => {
    if (slugs.has(l.slug)) {
      duplicateSlugs.push(l.slug);
    }
    slugs.add(l.slug);

    if (!slugPattern.test(l.slug)) {
      invalidSlugs.push(`${l.slug} (${l.first_name} ${l.last_name})`);
    }
  });

  console.log(`Total slugs: ${slugs.size}`);
  console.log(`${duplicateSlugs.length === 0 ? '✅' : '❌'} Duplicate slugs: ${duplicateSlugs.length}`);
  if (duplicateSlugs.length > 0) {
    duplicateSlugs.forEach(s => console.log(`   - ${s}`));
  }

  console.log(`${invalidSlugs.length === 0 ? '✅' : '⚠️ '} Invalid slug formats: ${invalidSlugs.length}`);
  if (invalidSlugs.length > 0) {
    invalidSlugs.slice(0, 5).forEach(s => console.log(`   - ${s}`));
  }

  // Check for suspicious characters in names
  const suspiciousNames: string[] = [];
  lobbyists?.forEach((l) => {
    const fullName = `${l.first_name} ${l.last_name}`;
    if (/[<>{}[\]\\|`~]/.test(fullName)) {
      suspiciousNames.push(fullName);
    }
  });
  console.log(`${suspiciousNames.length === 0 ? '✅' : '⚠️ '} Names with suspicious characters: ${suspiciousNames.length}`);

  // ============================================================================
  // 2. DATA DISTRIBUTION ANALYSIS
  // ============================================================================
  console.log('\n\n2. DATA DISTRIBUTION ANALYSIS');
  console.log('-'.repeat(80));

  // Cities per lobbyist
  const citiesPerLobbyist = lobbyists?.map(l => l.cities?.length || 0) || [];
  const avgCities = citiesPerLobbyist.reduce((a, b) => a + b, 0) / citiesPerLobbyist.length;
  const maxCities = Math.max(...citiesPerLobbyist);
  const minCities = Math.min(...citiesPerLobbyist);

  console.log('\nCities per lobbyist:');
  console.log(`  Average: ${avgCities.toFixed(1)}`);
  console.log(`  Min: ${minCities}, Max: ${maxCities}`);

  const manyCities = lobbyists?.filter(l => (l.cities?.length || 0) > 20) || [];
  if (manyCities.length > 0) {
    console.log(`  ⚠️  ${manyCities.length} lobbyists with >20 cities (potential data quality issue)`);
    manyCities.slice(0, 3).forEach(l => {
      console.log(`     - ${l.first_name} ${l.last_name}: ${l.cities?.length} cities`);
    });
  }

  // Subjects per lobbyist
  const subjectsPerLobbyist = lobbyists?.map(l => l.subject_areas?.length || 0) || [];
  const avgSubjects = subjectsPerLobbyist.reduce((a, b) => a + b, 0) / subjectsPerLobbyist.length;
  const maxSubjects = Math.max(...subjectsPerLobbyist);
  const minSubjects = Math.min(...subjectsPerLobbyist);

  console.log('\nSubject areas per lobbyist:');
  console.log(`  Average: ${avgSubjects.toFixed(1)}`);
  console.log(`  Min: ${minSubjects}, Max: ${maxSubjects}`);

  const manySubjects = lobbyists?.filter(l => (l.subject_areas?.length || 0) > 50) || [];
  if (manySubjects.length > 0) {
    console.log(`  ⚠️  ${manySubjects.length} lobbyists with >50 subjects (might be too generic)`);
    manySubjects.slice(0, 3).forEach(l => {
      console.log(`     - ${l.first_name} ${l.last_name}: ${l.subject_areas?.length} subjects`);
    });
  }

  const fewSubjects = lobbyists?.filter(l => (l.subject_areas?.length || 0) <= 2) || [];
  console.log(`  ${fewSubjects.length} lobbyists with ≤2 subjects (${((fewSubjects.length / (lobbyists?.length || 1)) * 100).toFixed(1)}%)`);

  // ============================================================================
  // 3. BIO QUALITY ANALYSIS
  // ============================================================================
  console.log('\n\n3. BIO QUALITY ANALYSIS');
  console.log('-'.repeat(80));

  const bioLengths = lobbyists?.map(l => l.bio?.length || 0) || [];
  const avgBioLength = bioLengths.reduce((a, b) => a + b, 0) / bioLengths.length;
  const shortBios = lobbyists?.filter(l => (l.bio?.length || 0) < 50) || [];
  const longBios = lobbyists?.filter(l => (l.bio?.length || 0) > 500) || [];

  console.log(`\nAverage bio length: ${avgBioLength.toFixed(0)} characters`);
  console.log(`${shortBios.length === 0 ? '✅' : '⚠️ '} Short bios (<50 chars): ${shortBios.length}`);
  if (shortBios.length > 0 && shortBios.length <= 5) {
    shortBios.forEach(l => {
      console.log(`   - ${l.first_name} ${l.last_name}: "${l.bio?.substring(0, 50)}"`);
    });
  }
  console.log(`Long bios (>500 chars): ${longBios.length}`);

  // Check for placeholder/generic bios
  const placeholderBios = lobbyists?.filter(l => {
    const bio = l.bio?.toLowerCase() || '';
    return bio.includes('lorem ipsum') ||
           bio.includes('placeholder') ||
           bio.includes('test bio') ||
           bio === 'n/a' ||
           bio === 'tbd';
  }) || [];
  console.log(`${placeholderBios.length === 0 ? '✅' : '⚠️ '} Placeholder bios: ${placeholderBios.length}`);

  // ============================================================================
  // 4. VIEW COUNT ANALYSIS
  // ============================================================================
  console.log('\n\n4. VIEW COUNT ANALYSIS');
  console.log('-'.repeat(80));

  const viewCounts = lobbyists?.map(l => l.view_count || 0) || [];
  const totalViews = viewCounts.reduce((a, b) => a + b, 0);
  const avgViews = totalViews / viewCounts.length;
  const maxViews = Math.max(...viewCounts);

  console.log(`\nTotal views: ${totalViews.toLocaleString()}`);
  console.log(`Average views per lobbyist: ${avgViews.toFixed(1)}`);
  console.log(`Max views: ${maxViews}`);

  const zeroViews = lobbyists?.filter(l => (l.view_count || 0) === 0) || [];
  console.log(`Lobbyists with 0 views: ${zeroViews.length} (${((zeroViews.length / (lobbyists?.length || 1)) * 100).toFixed(1)}%)`);

  const topViewed = lobbyists?.sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5) || [];
  console.log('\nTop 5 viewed:');
  topViewed.forEach((l, i) => {
    console.log(`  ${i + 1}. ${l.first_name} ${l.last_name}: ${l.view_count} views (${l.subscription_tier})`);
  });

  // ============================================================================
  // 5. PROFILE IMAGE ANALYSIS
  // ============================================================================
  console.log('\n\n5. PROFILE IMAGE ANALYSIS');
  console.log('-'.repeat(80));

  const withImages = lobbyists?.filter(l => l.profile_image_url) || [];
  const withoutImages = lobbyists?.filter(l => !l.profile_image_url) || [];

  console.log(`\nLobbyists with profile images: ${withImages.length} (${((withImages.length / (lobbyists?.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`Lobbyists without profile images: ${withoutImages.length} (${((withoutImages.length / (lobbyists?.length || 1)) * 100).toFixed(1)}%)`);

  // Check for broken or invalid URLs
  const suspiciousUrls = withImages.filter(l => {
    const url = l.profile_image_url || '';
    return !url.startsWith('http://') && !url.startsWith('https://');
  });
  console.log(`${suspiciousUrls.length === 0 ? '✅' : '⚠️ '} Suspicious image URLs: ${suspiciousUrls.length}`);

  // ============================================================================
  // 6. CITY AND SUBJECT VALIDATION
  // ============================================================================
  console.log('\n\n6. CITY AND SUBJECT DATA VALIDATION');
  console.log('-'.repeat(80));

  // Check for case inconsistencies
  const cityNames = new Set<string>();
  const cityVariations: Record<string, string[]> = {};

  lobbyists?.forEach(l => {
    l.cities?.forEach((city: string) => {
      const lower = city.toLowerCase();
      if (!cityVariations[lower]) {
        cityVariations[lower] = [];
      }
      if (!cityVariations[lower].includes(city)) {
        cityVariations[lower].push(city);
      }
      cityNames.add(city);
    });
  });

  const inconsistentCities = Object.entries(cityVariations).filter(([, variations]) => variations.length > 1);
  console.log(`${inconsistentCities.length === 0 ? '✅' : '⚠️ '} Cities with case inconsistencies: ${inconsistentCities.length}`);
  if (inconsistentCities.length > 0) {
    inconsistentCities.slice(0, 5).forEach(([lower, variations]) => {
      console.log(`   - ${variations.join(', ')}`);
    });
  }

  // Check for duplicate/similar subject names
  const subjectNames = new Set<string>();
  const subjectVariations: Record<string, string[]> = {};

  lobbyists?.forEach(l => {
    l.subject_areas?.forEach((subject: string) => {
      const lower = subject.toLowerCase();
      if (!subjectVariations[lower]) {
        subjectVariations[lower] = [];
      }
      if (!subjectVariations[lower].includes(subject)) {
        subjectVariations[lower].push(subject);
      }
      subjectNames.add(subject);
    });
  });

  const inconsistentSubjects = Object.entries(subjectVariations).filter(([, variations]) => variations.length > 1);
  console.log(`${inconsistentSubjects.length === 0 ? '✅' : '⚠️ '} Subjects with case inconsistencies: ${inconsistentSubjects.length}`);
  if (inconsistentSubjects.length > 0) {
    inconsistentSubjects.slice(0, 5).forEach(([lower, variations]) => {
      console.log(`   - ${variations.join(', ')}`);
    });
  }

  // ============================================================================
  // 7. PREMIUM TIER ANALYSIS
  // ============================================================================
  console.log('\n\n7. PREMIUM TIER ANALYSIS');
  console.log('-'.repeat(80));

  const featured = lobbyists?.filter(l => l.subscription_tier === 'featured') || [];
  const premium = lobbyists?.filter(l => l.subscription_tier === 'premium') || [];
  const free = lobbyists?.filter(l => l.subscription_tier === 'free') || [];

  console.log(`\nFeatured: ${featured.length}`);
  featured.forEach(l => {
    const hasImage = l.profile_image_url ? '✅' : '❌';
    const bioLength = l.bio?.length || 0;
    console.log(`  ${hasImage} ${l.first_name} ${l.last_name} - ${bioLength} char bio, ${l.view_count} views`);
  });

  console.log(`\nPremium: ${premium.length}`);
  premium.forEach(l => {
    const hasImage = l.profile_image_url ? '✅' : '❌';
    const bioLength = l.bio?.length || 0;
    console.log(`  ${hasImage} ${l.first_name} ${l.last_name} - ${bioLength} char bio, ${l.view_count} views`);
  });

  // Check if premium/featured have better profiles
  const featuredAvgBio = featured.reduce((sum, l) => sum + (l.bio?.length || 0), 0) / (featured.length || 1);
  const premiumAvgBio = premium.reduce((sum, l) => sum + (l.bio?.length || 0), 0) / (premium.length || 1);
  const freeAvgBio = free.reduce((sum, l) => sum + (l.bio?.length || 0), 0) / (free.length || 1);

  console.log(`\nAverage bio lengths:`);
  console.log(`  Featured: ${featuredAvgBio.toFixed(0)} chars`);
  console.log(`  Premium: ${premiumAvgBio.toFixed(0)} chars`);
  console.log(`  Free: ${freeAvgBio.toFixed(0)} chars`);

  // ============================================================================
  // 8. CITY AND SUBJECT TABLE VALIDATION
  // ============================================================================
  console.log('\n\n8. CITY AND SUBJECT TABLE VALIDATION');
  console.log('-'.repeat(80));

  // Check for missing slugs
  const citiesWithoutSlug = cities?.filter(c => !c.slug) || [];
  const subjectsWithoutSlug = subjects?.filter(s => !s.slug) || [];

  console.log(`${citiesWithoutSlug.length === 0 ? '✅' : '❌'} Cities without slugs: ${citiesWithoutSlug.length}`);
  console.log(`${subjectsWithoutSlug.length === 0 ? '✅' : '❌'} Subjects without slugs: ${subjectsWithoutSlug.length}`);

  // Check for duplicate slugs in tables
  const citySlugSet = new Set<string>();
  const duplicateCitySlugs: string[] = [];
  cities?.forEach(c => {
    if (citySlugSet.has(c.slug)) {
      duplicateCitySlugs.push(c.slug);
    }
    citySlugSet.add(c.slug);
  });

  const subjectSlugSet = new Set<string>();
  const duplicateSubjectSlugs: string[] = [];
  subjects?.forEach(s => {
    if (subjectSlugSet.has(s.slug)) {
      duplicateSubjectSlugs.push(s.slug);
    }
    subjectSlugSet.add(s.slug);
  });

  console.log(`${duplicateCitySlugs.length === 0 ? '✅' : '❌'} Duplicate city slugs: ${duplicateCitySlugs.length}`);
  console.log(`${duplicateSubjectSlugs.length === 0 ? '✅' : '❌'} Duplicate subject slugs: ${duplicateSubjectSlugs.length}`);

  // Check for missing descriptions
  const citiesWithoutDesc = cities?.filter(c => !c.meta_description || c.meta_description.length < 50) || [];
  const subjectsWithoutDesc = subjects?.filter(s => !s.description || s.description.length < 50) || [];

  console.log(`${citiesWithoutDesc.length === 0 ? '✅' : '⚠️ '} Cities with short/missing descriptions: ${citiesWithoutDesc.length}`);
  console.log(`${subjectsWithoutDesc.length === 0 ? '✅' : '⚠️ '} Subjects with short/missing descriptions: ${subjectsWithoutDesc.length}`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('DEEP AUDIT SUMMARY');
  console.log('='.repeat(80));

  const criticalIssues: string[] = [];
  const warnings: string[] = [];

  if (duplicateSlugs.length > 0) criticalIssues.push(`${duplicateSlugs.length} duplicate lobbyist slugs`);
  if (citiesWithoutSlug.length > 0) criticalIssues.push(`${citiesWithoutSlug.length} cities without slugs`);
  if (subjectsWithoutSlug.length > 0) criticalIssues.push(`${subjectsWithoutSlug.length} subjects without slugs`);
  if (duplicateCitySlugs.length > 0) criticalIssues.push(`${duplicateCitySlugs.length} duplicate city slugs`);
  if (duplicateSubjectSlugs.length > 0) criticalIssues.push(`${duplicateSubjectSlugs.length} duplicate subject slugs`);

  if (invalidSlugs.length > 0) warnings.push(`${invalidSlugs.length} invalid slug formats`);
  if (suspiciousNames.length > 0) warnings.push(`${suspiciousNames.length} names with suspicious characters`);
  if (manyCities.length > 0) warnings.push(`${manyCities.length} lobbyists with >20 cities`);
  if (manySubjects.length > 0) warnings.push(`${manySubjects.length} lobbyists with >50 subjects`);
  if (shortBios.length > 0) warnings.push(`${shortBios.length} short bios (<50 chars)`);
  if (placeholderBios.length > 0) warnings.push(`${placeholderBios.length} placeholder bios`);
  if (suspiciousUrls.length > 0) warnings.push(`${suspiciousUrls.length} suspicious image URLs`);
  if (inconsistentCities.length > 0) warnings.push(`${inconsistentCities.length} cities with case inconsistencies`);
  if (inconsistentSubjects.length > 0) warnings.push(`${inconsistentSubjects.length} subjects with case inconsistencies`);

  if (criticalIssues.length === 0 && warnings.length === 0) {
    console.log('\n✅ NO CRITICAL ISSUES OR WARNINGS - Data quality is excellent!');
  } else {
    if (criticalIssues.length > 0) {
      console.log(`\n❌ CRITICAL ISSUES (${criticalIssues.length}):\n`);
      criticalIssues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }

    if (warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS (${warnings.length}):\n`);
      warnings.forEach((warning, i) => {
        console.log(`${i + 1}. ${warning}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
}

deepAudit();
