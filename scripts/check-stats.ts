import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStats() {
  // Check lobbyists count
  const { data: lobbyists, error: lError } = await supabase
    .from('lobbyists')
    .select('*')
    .eq('is_active', true);

  if (lError) console.error('Lobbyists error:', lError);
  console.log('Active lobbyists:', lobbyists?.length);

  // Check clients count
  const { data: clients, error: cError } = await supabase
    .from('clients')
    .select('*');

  if (cError) console.error('Clients error:', cError);
  console.log('Total clients:', clients?.length);

  // Check lobbyist_clients relationships
  const { data: relations, error: rError } = await supabase
    .from('lobbyist_clients')
    .select('*');

  if (rError) console.error('Relations error:', rError);
  console.log('Lobbyist-client relationships:', relations?.length);

  // Sample a few lobbyists
  console.log('\nSample lobbyist data:');
  if (lobbyists && lobbyists.length > 0) {
    const sample = lobbyists.slice(0, 3);
    sample.forEach(l => {
      const cityCount = l.cities?.length || 0;
      const subjectCount = l.subject_areas?.length || 0;
      console.log(`- ${l.first_name} ${l.last_name}: cities=${cityCount}, subjects=${subjectCount}`);
    });
  }

  process.exit(0);
}

checkStats();
