#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 Normalizing City Names in Lobbyist Records');
  console.log('='.repeat(60) + '\n');

  const supabase = createServiceClient();

  // Get all cities from the cities table to use as canonical names
  const { data: cities } = await supabase.from('cities').select('name, slug');

  // Create mapping from various formats to canonical name
  const cityMap = new Map<string, string>();
  cities?.forEach(city => {
    // Map slug to name
    cityMap.set(city.slug, city.name);
    cityMap.set(city.slug.toLowerCase(), city.name);

    // Map lowercase to name
    cityMap.set(city.name.toLowerCase(), city.name);

    // Map uppercase to name
    cityMap.set(city.name.toUpperCase(), city.name);

    // Map the name to itself (canonical)
    cityMap.set(city.name, city.name);
  });

  // Add specific mappings for known issues
  cityMap.set('fort-worth', 'Fort Worth');
  cityMap.set('san-antonio', 'San Antonio');
  cityMap.set('corpus-christi', 'Corpus Christi');
  cityMap.set('DRIPPING SPRINGS', 'Dripping Springs');

  console.log(`📋 Created mapping for ${cityMap.size} city name variations\n`);

  // Get all lobbyists (paginate to get all records)
  let allLobbyists: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: lobbyists } = await supabase
      .from('lobbyists')
      .select('id, first_name, last_name, cities')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (!lobbyists || lobbyists.length === 0) break;

    allLobbyists = allLobbyists.concat(lobbyists);
    page++;

    if (lobbyists.length < pageSize) break;
  }

  const lobbyists = allLobbyists;

  console.log(`👥 Processing ${lobbyists?.length || 0} lobbyist records...\n`);

  let updatedCount = 0;
  let unchangedCount = 0;

  for (const lobbyist of lobbyists || []) {
    if (!lobbyist.cities || lobbyist.cities.length === 0) {
      unchangedCount++;
      continue;
    }

    // Normalize city names
    const normalizedCities = lobbyist.cities
      .map((city: string) => {
        const normalized = cityMap.get(city);
        if (normalized && normalized !== city) {
          console.log(`   "${city}" → "${normalized}" for ${lobbyist.first_name} ${lobbyist.last_name}`);
          return normalized;
        }
        return city;
      })
      .filter((city: string, index: number, arr: string[]) => arr.indexOf(city) === index); // Remove duplicates

    // Check if anything changed
    const hasChanges =
      normalizedCities.length !== lobbyist.cities.length ||
      normalizedCities.some((city: string, i: number) => city !== lobbyist.cities[i]);

    if (hasChanges) {
      // Update the record
      const { error } = await supabase
        .from('lobbyists')
        .update({ cities: normalizedCities })
        .eq('id', lobbyist.id);

      if (error) {
        console.error(`   ❌ Error updating ${lobbyist.first_name} ${lobbyist.last_name}:`, error.message);
      } else {
        updatedCount++;
      }
    } else {
      unchangedCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Updated ${updatedCount} lobbyist records`);
  console.log(`⏭️  Skipped ${unchangedCount} records (no changes needed)`);
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
