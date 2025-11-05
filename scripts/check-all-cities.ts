#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  // Get all cities from the cities table
  const { data: cities } = await supabase
    .from('cities')
    .select('*')
    .order('population', { ascending: false });

  console.log(`\nChecking ${cities?.length || 0} cities...\n`);

  // Get all lobbyists to count by city
  const { data: lobbyists } = await supabase
    .from('lobbyists')
    .select('cities')
    .eq('is_active', true);

  // Count lobbyists per city NAME (not slug)
  const cityCountsByName: Record<string, number> = {};
  const cityCountsBySlug: Record<string, number> = {};

  lobbyists?.forEach((lobbyist) => {
    lobbyist.cities?.forEach((cityName: string) => {
      // Count by name (as stored in lobbyist.cities array)
      cityCountsByName[cityName] = (cityCountsByName[cityName] || 0) + 1;

      // Count by lowercase slug version
      const slug = cityName.toLowerCase().replace(/\s+/g, '-');
      cityCountsBySlug[slug] = (cityCountsBySlug[slug] || 0) + 1;
    });
  });

  console.log('Top 20 cities with mismatches:\n');
  console.log('City Name                | By Name | By Slug | Difference');
  console.log('------------------------+----------+----------+-----------');

  let mismatches = 0;

  for (const city of cities?.slice(0, 20) || []) {
    const countByName = cityCountsByName[city.name] || 0;
    const countBySlug = cityCountsBySlug[city.slug] || 0;
    const diff = countByName - countBySlug;

    if (diff !== 0) {
      mismatches++;
    }

    const nameDisplay = city.name.padEnd(23);
    const nameCount = countByName.toString().padStart(7);
    const slugCount = countBySlug.toString().padStart(7);
    const diffDisplay = diff > 0 ? `+${diff}` : diff.toString();

    console.log(`${nameDisplay} | ${nameCount} | ${slugCount} | ${diffDisplay.padStart(9)}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total cities with mismatches: ${mismatches}`);
  console.log('='.repeat(60) + '\n');

  // Show cities that exist in lobbyist data but not in cities table
  const cityNamesInTable = new Set(cities?.map(c => c.name) || []);
  const cityNamesInData = Object.keys(cityCountsByName);
  const missingCities = cityNamesInData.filter(name => !cityNamesInTable.has(name));

  if (missingCities.length > 0) {
    console.log('\nCities in lobbyist data but NOT in cities table:');
    missingCities.forEach(name => {
      console.log(`- ${name} (${cityCountsByName[name]} lobbyists)`);
    });
  }
}

main().catch(console.error);
