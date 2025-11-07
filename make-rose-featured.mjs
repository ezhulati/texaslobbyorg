import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabase = createClient(
  'https://tavwfbqflredtowjelbx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMxNzYwNSwiZXhwIjoyMDc3ODkzNjA1fQ.Fxxb6Qt6K9WAHXik86PcaNSmiagYQicAv8ONtx6Np3Q'
);

console.log('Searching for Denise Rose...\n');

// Search for Denise Rose
const { data: results } = await supabase
  .from('lobbyists')
  .select('id, first_name, last_name, slug, subscription_tier, is_claimed')
  .ilike('last_name', '%rose%')
  .ilike('first_name', '%denise%');

console.log(`Found ${results?.length || 0} matches:\n`);

if (results && results.length > 0) {
  results.forEach((l, i) => {
    console.log(`${i + 1}. ${l.first_name} ${l.last_name} (${l.slug})`);
    console.log(`   Current: ${l.subscription_tier}, claimed: ${l.is_claimed}\n`);
  });

  // Upgrade the first match
  const denise = results[0];
  console.log(`Upgrading ${denise.first_name} ${denise.last_name} to FEATURED...\n`);

  const { error: updateError } = await supabase
    .from('lobbyists')
    .update({
      subscription_tier: 'featured',
      is_claimed: true,
      subscription_started_at: new Date().toISOString(),
      featured_order: 2 // Second featured profile
    })
    .eq('id', denise.id);

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    process.exit(1);
  }

  console.log('✓ Successfully upgraded to FEATURED');
  console.log('  - Subscription tier: featured');
  console.log('  - Claimed: true');
  console.log('  - Featured order: 2');
  console.log(`  - Profile: http://localhost:4321/lobbyists/${denise.slug}`);
} else {
  console.log('❌ No matches found. Trying broader search...\n');

  const { data: roseResults } = await supabase
    .from('lobbyists')
    .select('first_name, last_name, slug')
    .ilike('last_name', '%rose%')
    .limit(10);

  console.log('All "Rose" results:');
  if (roseResults) {
    roseResults.forEach(l => {
      console.log(`  - ${l.first_name} ${l.last_name} (${l.slug})`);
    });
  }
}
