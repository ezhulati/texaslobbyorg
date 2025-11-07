import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabase = createClient(
  'https://tavwfbqflredtowjelbx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMxNzYwNSwiZXhwIjoyMDc3ODkzNjA1fQ.Fxxb6Qt6K9WAHXik86PcaNSmiagYQicAv8ONtx6Np3Q'
);

console.log('Searching for Mike Toomey...\n');

// Search for Mike Toomey variations
const { data: results } = await supabase
  .from('lobbyists')
  .select('id, first_name, last_name, slug, subscription_tier, is_claimed')
  .or('last_name.ilike.%toomey%,last_name.ilike.%toomy%');

console.log(`Found ${results?.length || 0} potential matches:\n`);

if (results) {
  results.forEach((l, i) => {
    console.log(`${i + 1}. ${l.first_name} ${l.last_name} (${l.slug})`);
    console.log(`   Current: ${l.subscription_tier}, claimed: ${l.is_claimed}\n`);
  });
}

if (!results || results.length === 0) {
  console.log('❌ No matches found. Trying broader search...\n');

  const { data: broadResults } = await supabase
    .from('lobbyists')
    .select('first_name, last_name, slug')
    .or('first_name.ilike.%mike%,first_name.ilike.%michael%')
    .limit(10);

  console.log('Mike/Michael results:');
  if (broadResults) {
    broadResults.forEach(l => {
      console.log(`  - ${l.first_name} ${l.last_name} (${l.slug})`);
    });
  }
  process.exit(0);
}

// If we found exactly one match, upgrade it
if (results.length === 1) {
  const toomey = results[0];
  console.log(`Upgrading ${toomey.first_name} ${toomey.last_name} to FEATURED...\n`);

  const { error: updateError } = await supabase
    .from('lobbyists')
    .update({
      subscription_tier: 'featured',
      is_claimed: true,
      subscription_started_at: new Date().toISOString(),
      featured_order: 1 // Make him top featured
    })
    .eq('id', toomey.id);

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    process.exit(1);
  }

  console.log('✓ Successfully upgraded to FEATURED');
  console.log('  - Subscription tier: featured');
  console.log('  - Claimed: true');
  console.log('  - Featured order: 1 (top priority)');
  console.log(`  - Profile: http://localhost:4321/lobbyists/${toomey.slug}`);
} else {
  console.log('\nMultiple matches found. Please specify which one to upgrade.');
}
