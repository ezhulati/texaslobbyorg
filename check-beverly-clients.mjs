import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.PUBLIC_SUPABASE_ANON_KEY
);

// Get Beverly's lobbyist record
const { data: lobbyist, error: lobbyistError } = await supabase
  .from('lobbyists')
  .select('id, first_name, last_name, slug')
  .eq('slug', 'beverly-c-cornwell')
  .single();

if (lobbyistError) {
  console.error('Error fetching lobbyist:', lobbyistError);
  process.exit(1);
}

console.log('Beverly C. Cornwell record:');
console.log(lobbyist);
console.log('\n---\n');

// Get her clients
const { data: clients, error: clientsError } = await supabase
  .from('clients')
  .select('*')
  .eq('lobbyist_id', lobbyist.id)
  .order('is_current', { ascending: false })
  .order('year_started', { ascending: false });

if (clientsError) {
  console.error('Error fetching clients:', clientsError);
  process.exit(1);
}

console.log(`Found ${clients.length} client(s) for Beverly C. Cornwell`);
if (clients.length > 0) {
  console.log('\nClients:');
  clients.forEach((client, i) => {
    console.log(`\n${i + 1}. ${client.name}`);
    console.log(`   Description: ${client.description || 'N/A'}`);
    console.log(`   Current: ${client.is_current}`);
    console.log(`   Year Started: ${client.year_started || 'N/A'}`);
  });
} else {
  console.log('\nNo clients found in database for this lobbyist.');
}
