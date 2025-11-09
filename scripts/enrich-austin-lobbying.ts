/**
 * Austin City Lobbying Registry Enrichment Script
 *
 * This script enriches lobbyist profiles with Austin city lobbying data
 * from the City of Austin Open Data Portal (Socrata API).
 *
 * Data Sources:
 * - Lobbyist Registrants: https://data.austintexas.gov/resource/58ix-34ma.json
 * - Lobbyist Clients: https://data.austintexas.gov/resource/7ena-g23u.json
 *
 * Purpose:
 * - Identifies lobbyists active at Austin city level (vs just state)
 * - Captures municipal clients that may not be in TEC state data
 * - Provides differentiated activity indicator
 *
 * Usage:
 * 1. Ensure .env file has Supabase credentials
 * 2. Run database migration first to add municipal_registrations table
 * 3. Run: npx tsx scripts/enrich-austin-lobbying.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const AUSTIN_REGISTRANTS_API = 'https://data.austintexas.gov/resource/58ix-34ma.json';
const AUSTIN_CLIENTS_API = 'https://data.austintexas.gov/resource/7ena-g23u.json';
const BATCH_SIZE = 50;
const REQUEST_DELAY_MS = 500; // Rate limiting
const MAX_RECORDS = 10000; // Socrata default limit

interface AustinRegistrant {
  first_name?: string;
  last_name?: string;
  business_entity_name?: string;
  organization_name?: string;
  registration_year?: string;
  status?: string;
  email?: string;
  phone?: string;
}

interface AustinClient {
  lobbyist_first_name?: string;
  lobbyist_last_name?: string;
  client_name?: string;
  registration_year?: string;
}

interface MunicipalRegistration {
  lobbyist_id: string;
  city: string;
  clients: string[];
  year: number;
  status: string;
}

// Initialize Supabase client with service role key
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Delay helper for rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalize name for fuzzy matching
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate simple string similarity score (0-1)
 */
function similarityScore(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }

  return matrix[str2.length]![str1.length]!;
}

/**
 * Find matching lobbyist in database by name
 */
async function findLobbyistByName(
  firstName: string,
  lastName: string
): Promise<string | null> {
  const { data: lobbyists, error } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name');

  if (error || !lobbyists) {
    console.error('Error fetching lobbyists:', error);
    return null;
  }

  const searchName = normalizeName(`${firstName} ${lastName}`);
  let bestMatch: { id: string; score: number } | null = null;

  for (const lobbyist of lobbyists) {
    const lobbyistName = normalizeName(`${lobbyist.first_name} ${lobbyist.last_name}`);
    const score = similarityScore(searchName, lobbyistName);

    // Require at least 85% similarity
    if (score >= 0.85 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: lobbyist.id, score };
    }
  }

  return bestMatch?.id || null;
}

/**
 * Fetch Austin lobbyist registrants
 */
async function fetchAustinRegistrants(): Promise<AustinRegistrant[]> {
  console.log('Fetching Austin lobbyist registrants...');

  try {
    // Socrata API supports pagination with $limit and $offset
    const response = await fetch(`${AUSTIN_REGISTRANTS_API}?$limit=${MAX_RECORDS}`);
    const registrants: AustinRegistrant[] = await response.json();

    console.log(`Found ${registrants.length} Austin registrants\n`);
    return registrants;
  } catch (error) {
    console.error('Error fetching Austin registrants:', error);
    return [];
  }
}

/**
 * Fetch Austin lobbyist clients
 */
async function fetchAustinClients(): Promise<AustinClient[]> {
  console.log('Fetching Austin lobbyist clients...');

  try {
    const response = await fetch(`${AUSTIN_CLIENTS_API}?$limit=${MAX_RECORDS}`);
    const clients: AustinClient[] = await response.json();

    console.log(`Found ${clients.length} Austin client relationships\n`);
    return clients;
  } catch (error) {
    console.error('Error fetching Austin clients:', error);
    return [];
  }
}

/**
 * Group clients by lobbyist and year
 */
function groupClientsByLobbyist(clients: AustinClient[]): Map<string, Map<number, string[]>> {
  const grouped = new Map<string, Map<number, string[]>>();

  for (const client of clients) {
    if (!client.lobbyist_first_name || !client.lobbyist_last_name || !client.client_name) {
      continue;
    }

    const lobbyistKey = `${client.lobbyist_first_name}|${client.lobbyist_last_name}`;
    const year = client.registration_year ? parseInt(client.registration_year) : new Date().getFullYear();

    if (!grouped.has(lobbyistKey)) {
      grouped.set(lobbyistKey, new Map());
    }

    const lobbyistClients = grouped.get(lobbyistKey)!;
    if (!lobbyistClients.has(year)) {
      lobbyistClients.set(year, []);
    }

    lobbyistClients.get(year)!.push(client.client_name);
  }

  return grouped;
}

/**
 * Process Austin registrants and create municipal registrations
 */
async function processAustinRegistrants(
  registrants: AustinRegistrant[],
  clientsMap: Map<string, Map<number, string[]>>
): Promise<MunicipalRegistration[]> {
  console.log('Processing Austin registrants...');
  const registrations: MunicipalRegistration[] = [];
  let matchCount = 0;
  let noMatchCount = 0;

  for (const registrant of registrants) {
    await delay(100);

    // Skip if no name data
    if (!registrant.first_name || !registrant.last_name) {
      continue;
    }

    const lobbyistId = await findLobbyistByName(
      registrant.first_name,
      registrant.last_name
    );

    if (lobbyistId) {
      matchCount++;

      const lobbyistKey = `${registrant.first_name}|${registrant.last_name}`;
      const year = registrant.registration_year
        ? parseInt(registrant.registration_year)
        : new Date().getFullYear();

      // Get clients for this lobbyist and year
      const lobbyistClients = clientsMap.get(lobbyistKey);
      const yearClients = lobbyistClients?.get(year) || [];

      registrations.push({
        lobbyist_id: lobbyistId,
        city: 'Austin',
        clients: yearClients,
        year,
        status: registrant.status || 'active',
      });
    } else {
      noMatchCount++;
      console.log(`  No match found for: ${registrant.first_name} ${registrant.last_name}`);
    }
  }

  console.log(`Matched ${matchCount} registrants, ${noMatchCount} no match\n`);
  return registrations;
}

/**
 * Store municipal registrations in database
 */
async function storeMunicipalRegistrations(registrations: MunicipalRegistration[]): Promise<void> {
  console.log('Storing municipal registrations...');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < registrations.length; i += BATCH_SIZE) {
    const batch = registrations.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('municipal_registrations')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      console.log(`Stored batch ${i / BATCH_SIZE + 1}: ${data.length} registrations`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  console.log(`\nStored ${successCount} registrations, ${errorCount} errors\n`);
}

/**
 * Update lobbyist municipal activity fields
 */
async function updateLobbyistMunicipalActivity(): Promise<void> {
  console.log('Updating lobbyist municipal activity fields...');

  // Get all lobbyists with municipal registrations
  const { data: lobbyists, error } = await supabase
    .from('lobbyists')
    .select('id');

  if (error || !lobbyists) {
    console.error('Error fetching lobbyists:', error);
    return;
  }

  for (const lobbyist of lobbyists) {
    // Get unique cities for this lobbyist
    const { data: registrations, error: regError } = await supabase
      .from('municipal_registrations')
      .select('city')
      .eq('lobbyist_id', lobbyist.id);

    if (regError) continue;

    const cities = [...new Set(registrations.map(r => r.city))];

    if (cities.length > 0) {
      // Update lobbyist record with municipal activity
      await supabase
        .from('lobbyists')
        .update({
          municipal_activity_cities: cities,
        })
        .eq('id', lobbyist.id);
    }
  }

  console.log('Lobbyist municipal activity updated\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Austin Lobbying Registry Enrichment Script ===\n');
  console.log('Starting Austin municipal data enrichment...\n');

  try {
    // Fetch data from Socrata API
    const [registrants, clients] = await Promise.all([
      fetchAustinRegistrants(),
      fetchAustinClients(),
    ]);

    // Group clients by lobbyist
    const clientsMap = groupClientsByLobbyist(clients);
    console.log(`Grouped clients for ${clientsMap.size} unique lobbyists\n`);

    // Process registrants and match to our lobbyists
    const registrations = await processAustinRegistrants(registrants, clientsMap);
    console.log(`Total municipal registrations to store: ${registrations.length}\n`);

    // Store in database
    if (registrations.length > 0) {
      await storeMunicipalRegistrations(registrations);
      await updateLobbyistMunicipalActivity();
    }

    console.log('\n=== Enrichment Complete ===');
    console.log(`Austin registrants processed: ${registrants.length}`);
    console.log(`Austin clients processed: ${clients.length}`);
    console.log(`Total registrations stored: ${registrations.length}`);
  } catch (error) {
    console.error('Enrichment failed:', error);
    process.exit(1);
  }
}

main();
