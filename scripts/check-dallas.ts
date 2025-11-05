#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  // Count lobbyists where cities array contains 'Dallas'
  const { data: lobbyists, error } = await supabase
    .from('lobbyists')
    .select('first_name, last_name, cities')
    .contains('cities', ['Dallas'])
    .eq('is_active', true);

  console.log('\nLobbyists with "Dallas" in their cities:', lobbyists?.length || 0);

  // Also check for lowercase 'dallas'
  const { data: lobbyists2 } = await supabase
    .from('lobbyists')
    .select('first_name, last_name, cities')
    .contains('cities', ['dallas'])
    .eq('is_active', true);

  console.log('Lobbyists with "dallas" (lowercase) in their cities:', lobbyists2?.length || 0);

  // Show a few examples
  if (lobbyists && lobbyists.length > 0) {
    console.log('\nFirst 10 examples:');
    lobbyists.slice(0, 10).forEach(l => {
      console.log(`- ${l.first_name} ${l.last_name}: ${l.cities?.join(', ')}`);
    });
  }
}

main().catch(console.error);
