import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeClients() {
  // Get lobbyist count
  const { data: lobbyists, error: lobError } = await supabase
    .from('lobbyists')
    .select('*')
    .eq('is_active', true);

  if (lobError) {
    console.error('Lobbyist Error:', lobError);
  } else {
    console.log(`\nTotal Active Lobbyists: ${lobbyists?.length || 0}`);
  }

  // Get all clients
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('*');

  if (clientError) {
    console.error('Client Error:', clientError);
    return;
  }

  console.log(`Total Client Records: ${clients?.length || 0}`);

  // Count lobbyists per client
  const clientCounts: Record<string, { name: string; count: number }> = {};

  clients?.forEach(client => {
    const clientName = client.name;
    if (clientName) {
      if (!clientCounts[clientName]) {
        clientCounts[clientName] = { name: clientName, count: 0 };
      }
      clientCounts[clientName].count++;
    }
  });

  // Sort by count
  const sorted = Object.values(clientCounts).sort((a, b) => b.count - a.count);

  console.log(`\nUnique Clients: ${sorted.length}`);
  console.log('\n=== TOP 50 MOST LOBBIED CLIENTS ===\n');
  sorted.slice(0, 50).forEach((client, i) => {
    console.log(`${i + 1}. ${client.name} (${client.count} lobbyists)`);
  });
}

analyzeClients();
