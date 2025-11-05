import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function fixAllDataIssues() {
  console.log('Fixing all data issues...\n');

  // ============================================================================
  // 1. DELETE CITIES WITH NO LOBBYISTS
  // ============================================================================
  console.log('1. CLEANING UP CITIES');
  console.log('-'.repeat(80));

  const { data: cities } = await supabase
    .from('cities')
    .select('*')
    .order('name');

  const { data: lobbyists } = await supabase
    .from('lobbyists')
    .select('cities')
    .eq('is_active', true);

  // Count cities
  const cityCounts: Record<string, number> = {};
  lobbyists?.forEach((lobbyist) => {
    lobbyist.cities?.forEach((city: string) => {
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
  });

  // Delete cities with 0 lobbyists
  let deletedCities = 0;
  for (const city of cities || []) {
    if ((cityCounts[city.name] || 0) === 0) {
      const { error } = await supabase
        .from('cities')
        .delete()
        .eq('id', city.id);

      if (!error) {
        deletedCities++;
      }
    }
  }
  console.log(`✅ Deleted ${deletedCities} cities with no lobbyists\n`);

  // ============================================================================
  // 2. CLEAN UP OLD SUBJECT NAMES IN LOBBYIST DATA
  // ============================================================================
  console.log('2. CLEANING UP OLD SUBJECT NAMES IN LOBBYIST DATA');
  console.log('-'.repeat(80));

  const oldToNewSubjects: Record<string, string> = {
    'Healthcare': 'Health And Health Care',
    'Labor & Employment': 'Labor',
    'Criminal Justice': 'Crime',
    'Environmental': 'Environment',
    'Real Estate': 'Property Interests'
  };

  const { data: allLobbyists } = await supabase
    .from('lobbyists')
    .select('*')
    .eq('is_active', true);

  let updatedCount = 0;
  for (const lobbyist of allLobbyists || []) {
    let needsUpdate = false;
    const updatedSubjects = lobbyist.subject_areas?.map((subject: string) => {
      if (oldToNewSubjects[subject]) {
        needsUpdate = true;
        return oldToNewSubjects[subject];
      }
      return subject;
    });

    if (needsUpdate) {
      // Remove duplicates
      const uniqueSubjects = [...new Set(updatedSubjects)];

      const { error } = await supabase
        .from('lobbyists')
        .update({ subject_areas: uniqueSubjects })
        .eq('id', lobbyist.id);

      if (!error) {
        updatedCount++;
      }
    }
  }
  console.log(`✅ Updated ${updatedCount} lobbyists with old subject names\n`);

  // ============================================================================
  // 3. FIX LOBBYISTS WITH NO SUBJECTS
  // ============================================================================
  console.log('3. CHECKING LOBBYISTS WITH NO SUBJECTS');
  console.log('-'.repeat(80));

  const { data: noSubjects } = await supabase
    .from('lobbyists')
    .select('*')
    .eq('is_active', true)
    .or('subject_areas.is.null,subject_areas.eq.{}');

  console.log(`Found ${noSubjects?.length || 0} lobbyists with no subjects:`);
  noSubjects?.forEach(l => {
    console.log(`  - ${l.first_name} ${l.last_name} (${l.slug})`);
  });

  // For now, just report them. In production, you might want to:
  // - Mark them as inactive
  // - Add a default "Other" subject
  // - Or manually review them

  if ((noSubjects?.length || 0) > 0) {
    console.log('\n⚠️  These lobbyists should be reviewed manually\n');
  } else {
    console.log('\n✅ No lobbyists found without subjects\n');
  }

  // ============================================================================
  // 4. VERIFY FEATURED LOBBYISTS
  // ============================================================================
  console.log('4. CHECKING SUBSCRIPTION TIERS');
  console.log('-'.repeat(80));

  const { data: featured } = await supabase
    .from('lobbyists')
    .select('first_name, last_name, subscription_tier')
    .eq('subscription_tier', 'featured')
    .eq('is_active', true);

  const { data: premium } = await supabase
    .from('lobbyists')
    .select('first_name, last_name, subscription_tier')
    .eq('subscription_tier', 'premium')
    .eq('is_active', true);

  console.log(`Featured lobbyists: ${featured?.length || 0}`);
  featured?.forEach(l => {
    console.log(`  - ${l.first_name} ${l.last_name}`);
  });

  console.log(`\nPremium lobbyists: ${premium?.length || 0}`);
  premium?.forEach(l => {
    console.log(`  - ${l.first_name} ${l.last_name}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL FIXES COMPLETE!');
  console.log('='.repeat(80));
}

fixAllDataIssues();
