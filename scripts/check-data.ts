import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Get sample lobbyists
  const { data: lobbyists, count: lobCount } = await supabase
    .from('lobbyists')
    .select('first_name, last_name', { count: 'exact' })
    .limit(10);

  console.log('\n=== Sample Lobbyists ===');
  lobbyists?.forEach(l => console.log(`${l.first_name} ${l.last_name}`));
  console.log(`Total lobbyists: ${lobCount}\n`);

  // Get sample clients
  const { data: clients, count: clientCount } = await supabase
    .from('clients')
    .select('name', { count: 'exact' })
    .limit(10);

  console.log('=== Sample Clients ===');
  clients?.forEach(c => console.log(c.name));
  console.log(`Total clients: ${clientCount}\n`);
}

main();
