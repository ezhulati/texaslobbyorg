#!/usr/bin/env tsx

/**
 * Sync Cities and Subject Areas Tables
 *
 * Extracts unique cities and subject areas from lobbyists table
 * and populates the cities and subject_areas tables for filtering.
 */

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';
import { slugify } from '../src/lib/utils';

config();

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 Syncing Filter Tables');
  console.log('='.repeat(60) + '\n');

  const supabase = createServiceClient();

  // Fetch all lobbyists with their cities and subject_areas (paginate to get all records)
  let allLobbyists: any[] = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: lobbyists, error } = await supabase
      .from('lobbyists')
      .select('cities, subject_areas')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('❌ Error fetching lobbyists:', error.message);
      process.exit(1);
    }

    if (!lobbyists || lobbyists.length === 0) break;

    allLobbyists = allLobbyists.concat(lobbyists);
    page++;

    if (lobbyists.length < pageSize) break;
  }

  const lobbyists = allLobbyists;

  console.log(`📊 Analyzing ${lobbyists?.length || 0} lobbyist records...\n`);

  // Extract unique cities
  const citiesSet = new Set<string>();
  const subjectsSet = new Set<string>();

  for (const lobbyist of lobbyists || []) {
    // Add cities
    if (lobbyist.cities && Array.isArray(lobbyist.cities)) {
      for (const city of lobbyist.cities) {
        if (city && city.trim()) {
          citiesSet.add(city.trim());
        }
      }
    }

    // Add subject areas
    if (lobbyist.subject_areas && Array.isArray(lobbyist.subject_areas)) {
      for (const subject of lobbyist.subject_areas) {
        if (subject && subject.trim()) {
          subjectsSet.add(subject.trim());
        }
      }
    }
  }

  console.log(`🏙️  Found ${citiesSet.size} unique cities`);
  console.log(`📚 Found ${subjectsSet.size} unique subject areas\n`);

  // Sync cities table
  console.log('🏙️  Syncing cities table...');
  let citiesAdded = 0;
  let citiesSkipped = 0;

  for (const cityName of Array.from(citiesSet).sort()) {
    const slug = slugify(cityName);

    // Check if city already exists
    const { data: existing } = await supabase
      .from('cities')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      citiesSkipped++;
    } else {
      // Insert new city
      const { error: insertError } = await supabase
        .from('cities')
        .insert({
          name: cityName,
          slug: slug,
          meta_title: `${cityName} Lobbyists | Find Political Representation in ${cityName}, TX`,
          meta_description: `Search and hire experienced ${cityName} lobbyists. Browse profiles, client lists, and expertise areas.`
        });

      if (insertError) {
        console.error(`   ⚠️  Error inserting city "${cityName}":`, insertError.message);
      } else {
        citiesAdded++;
      }
    }
  }

  console.log(`   ✓ Added ${citiesAdded} new cities`);
  console.log(`   ✓ Skipped ${citiesSkipped} existing cities\n`);

  // Sync subject_areas table
  console.log('📚 Syncing subject areas table...');
  let subjectsAdded = 0;
  let subjectsSkipped = 0;

  for (const subjectName of Array.from(subjectsSet).sort()) {
    const slug = slugify(subjectName);

    // Check if subject area already exists
    const { data: existing } = await supabase
      .from('subject_areas')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      subjectsSkipped++;
    } else {
      // Insert new subject area
      const { error: insertError } = await supabase
        .from('subject_areas')
        .insert({
          name: subjectName,
          slug: slug,
          description: `Lobbyists specializing in ${subjectName.toLowerCase()} policy and regulations.`,
          meta_title: `${subjectName} Lobbyists in Texas | Industry Specialists`,
          meta_description: `Find Texas ${subjectName.toLowerCase()} lobbyists with expertise in policy, regulations, and advocacy.`
        });

      if (insertError) {
        console.error(`   ⚠️  Error inserting subject "${subjectName}":`, insertError.message);
      } else {
        subjectsAdded++;
      }
    }
  }

  console.log(`   ✓ Added ${subjectsAdded} new subject areas`);
  console.log(`   ✓ Skipped ${subjectsSkipped} existing subject areas\n`);

  console.log('✅ Filter tables synced successfully!\n');
}

main().catch(console.error);
