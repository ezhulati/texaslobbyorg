#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  const majorCities = ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso'];

  console.log('\n📊 Major Texas Cities Lobbyist Counts:\n');
  console.log('City          | Count');
  console.log('--------------+-------');

  for (const cityName of majorCities) {
    const { count } = await supabase
      .from('lobbyists')
      .select('id', { count: 'exact', head: true })
      .contains('cities', [cityName])
      .eq('is_active', true);

    console.log(`${cityName.padEnd(13)} | ${count || 0}`);
  }

  console.log('\n');
}

main().catch(console.error);
