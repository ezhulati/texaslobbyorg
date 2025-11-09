/**
 * OpenCorporates + GLEIF LEI Entity Normalization Script
 *
 * This script enriches client entities with corporate data from:
 * 1. OpenCorporates - Company registry data (optional, requires API token)
 * 2. GLEIF - Legal Entity Identifier data (free, no token required)
 *
 * Data Sources:
 * - OpenCorporates API: https://api.opencorporates.com/v0.4/companies/search
 * - GLEIF API: https://api.gleif.org/api/v1/lei-records
 *
 * Purpose:
 * - Normalize client entity names across sources
 * - Add corporate metadata (industry, headquarters, size)
 * - Link to parent companies and relationships
 * - Enable better matching and deduplication
 *
 * Usage:
 * 1. Ensure .env file has Supabase credentials
 * 2. Optionally set OPENCORPORATES_API_TOKEN for OpenCorporates access
 * 3. Run database migration first to add entity fields to clients table
 * 4. Run: npx tsx scripts/enrich-opencorporates.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const OPENCORPORATES_API_BASE = 'https://api.opencorporates.com/v0.4';
const GLEIF_API_BASE = 'https://api.gleif.org/api/v1';
const BATCH_SIZE = 50;
const REQUEST_DELAY_MS = 2000; // 2 seconds (OpenCorporates free tier limit)
const MAX_RETRIES = 3;

interface OpenCorporatesResult {
  name: string;
  company_number: string;
  jurisdiction_code: string;
  registered_address_in_full?: string;
  company_type?: string;
  current_status?: string;
  opencorporates_url?: string;
}

interface GLEIFResult {
  lei: string;
  legalName: string;
  legalAddress: string;
  headquartersAddress: string;
  registrationAuthority?: string;
  legalJurisdiction?: string;
  entityCategory?: string;
  status?: string;
}

interface EntityEnrichment {
  client_id: string;
  legal_name?: string;
  jurisdiction?: string;
  entity_type?: string;
  status?: string;
  registered_address?: string;
  lei_code?: string;
  opencorporates_url?: string;
}

// Initialize Supabase client with service role key
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openCorporatesToken = process.env.OPENCORPORATES_API_TOKEN; // Optional

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
 * Retry helper for API calls
 */
async function retryFetch(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (response.status === 429) {
        // Rate limit hit, wait longer
        console.log('Rate limit hit, waiting...');
        await delay(REQUEST_DELAY_MS * (i + 2));
        continue;
      }
      return response;
    } catch (error) {
      if (i === retries - 1) {
        console.error(`Failed after ${retries} retries:`, error);
        return null;
      }
      await delay(REQUEST_DELAY_MS);
    }
  }
  return null;
}

/**
 * Search OpenCorporates for company information
 */
async function searchOpenCorporates(companyName: string): Promise<OpenCorporatesResult | null> {
  if (!openCorporatesToken) {
    return null; // Skip if no API token
  }

  try {
    const searchQuery = encodeURIComponent(companyName);
    const url = `${OPENCORPORATES_API_BASE}/companies/search?q=${searchQuery}&jurisdiction_code=us_tx&api_token=${openCorporatesToken}`;

    const response = await retryFetch(url);
    if (!response?.ok) return null;

    const data = await response.json();
    const companies = data?.results?.companies || [];

    if (companies.length === 0) return null;

    // Take best match (first result)
    const company = companies[0]?.company;
    if (!company) return null;

    return {
      name: company.name,
      company_number: company.company_number,
      jurisdiction_code: company.jurisdiction_code,
      registered_address_in_full: company.registered_address_in_full,
      company_type: company.company_type,
      current_status: company.current_status,
      opencorporates_url: company.opencorporates_url,
    };
  } catch (error) {
    console.error(`Error searching OpenCorporates for "${companyName}":`, error);
    return null;
  }
}

/**
 * Search GLEIF for LEI data
 */
async function searchGLEIF(companyName: string): Promise<GLEIFResult | null> {
  try {
    // GLEIF search by entity name
    const searchQuery = encodeURIComponent(companyName);
    const url = `${GLEIF_API_BASE}/lei-records?filter[entity.legalName]=${searchQuery}`;

    const response = await retryFetch(url);
    if (!response?.ok) return null;

    const data = await response.json();
    const records = data?.data || [];

    if (records.length === 0) return null;

    // Take first match
    const record = records[0];
    const attributes = record?.attributes;
    if (!attributes) return null;

    const entity = attributes?.entity;
    const legalAddress = entity?.legalAddress;
    const headquartersAddress = entity?.headquartersAddress;

    return {
      lei: attributes?.lei,
      legalName: entity?.legalName?.name,
      legalAddress: legalAddress ? formatAddress(legalAddress) : '',
      headquartersAddress: headquartersAddress ? formatAddress(headquartersAddress) : '',
      registrationAuthority: entity?.registrationAuthority?.id,
      legalJurisdiction: entity?.legalJurisdiction,
      entityCategory: entity?.category,
      status: attributes?.registration?.status,
    };
  } catch (error) {
    console.error(`Error searching GLEIF for "${companyName}":`, error);
    return null;
  }
}

/**
 * Format GLEIF address object to string
 */
function formatAddress(addressObj: any): string {
  const parts: string[] = [];

  if (addressObj.addressLines) {
    parts.push(...addressObj.addressLines);
  }
  if (addressObj.city) parts.push(addressObj.city);
  if (addressObj.region) parts.push(addressObj.region);
  if (addressObj.postalCode) parts.push(addressObj.postalCode);
  if (addressObj.country) parts.push(addressObj.country);

  return parts.filter(Boolean).join(', ');
}

/**
 * Get all unique client names from database
 */
async function getAllClients(): Promise<Array<{ id: string; name: string }>> {
  console.log('Fetching all unique clients...');

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');

  if (error) {
    console.error('Error fetching clients:', error);
    return [];
  }

  // Deduplicate by name (keep first ID)
  const uniqueClients = new Map<string, string>();
  for (const client of clients || []) {
    if (!uniqueClients.has(client.name)) {
      uniqueClients.set(client.name, client.id);
    }
  }

  const result = Array.from(uniqueClients.entries()).map(([name, id]) => ({
    id,
    name,
  }));

  console.log(`Found ${result.length} unique client names\n`);
  return result;
}

/**
 * Enrich client entities
 */
async function enrichClients(clients: Array<{ id: string; name: string }>): Promise<EntityEnrichment[]> {
  console.log('Enriching client entities...');
  const enrichments: EntityEnrichment[] = [];

  let openCorporatesCount = 0;
  let gleifCount = 0;
  let bothCount = 0;
  let neitherCount = 0;

  for (let i = 0; i < clients.length; i++) {
    const client = clients[i]!;
    console.log(`Processing ${i + 1}/${clients.length}: ${client.name}`);

    // Search both sources
    const [ocData, gleifData] = await Promise.all([
      searchOpenCorporates(client.name),
      searchGLEIF(client.name),
    ]);

    // Combine results
    const enrichment: EntityEnrichment = {
      client_id: client.id,
    };

    if (ocData) {
      enrichment.legal_name = ocData.name;
      enrichment.jurisdiction = ocData.jurisdiction_code;
      enrichment.entity_type = ocData.company_type;
      enrichment.status = ocData.current_status;
      enrichment.registered_address = ocData.registered_address_in_full;
      enrichment.opencorporates_url = ocData.opencorporates_url;
      openCorporatesCount++;
    }

    if (gleifData) {
      // GLEIF takes precedence for LEI and legal name if available
      enrichment.lei_code = gleifData.lei;
      if (!enrichment.legal_name) {
        enrichment.legal_name = gleifData.legalName;
      }
      if (!enrichment.jurisdiction) {
        enrichment.jurisdiction = gleifData.legalJurisdiction;
      }
      if (!enrichment.entity_type) {
        enrichment.entity_type = gleifData.entityCategory;
      }
      if (!enrichment.registered_address) {
        enrichment.registered_address = gleifData.legalAddress || gleifData.headquartersAddress;
      }
      gleifCount++;
    }

    if (ocData && gleifData) {
      bothCount++;
    } else if (!ocData && !gleifData) {
      neitherCount++;
    }

    // Only store if we found something
    if (ocData || gleifData) {
      enrichments.push(enrichment);
    }

    // Rate limiting
    await delay(REQUEST_DELAY_MS);
  }

  console.log(`\nEnrichment results:`);
  console.log(`  OpenCorporates matches: ${openCorporatesCount}`);
  console.log(`  GLEIF LEI matches: ${gleifCount}`);
  console.log(`  Both sources: ${bothCount}`);
  console.log(`  No matches: ${neitherCount}\n`);

  return enrichments;
}

/**
 * Update client records with enriched data
 */
async function updateClientEnrichments(enrichments: EntityEnrichment[]): Promise<void> {
  console.log('Updating client records...');

  let successCount = 0;
  let errorCount = 0;

  for (const enrichment of enrichments) {
    const { client_id, ...updates } = enrichment;

    const { error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', client_id);

    if (error) {
      console.error(`Error updating client ${client_id}:`, error.message);
      errorCount++;
    } else {
      successCount++;
    }

    await delay(100);
  }

  console.log(`\nUpdated ${successCount} clients, ${errorCount} errors\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Entity Normalization Enrichment Script ===\n');

  if (!openCorporatesToken) {
    console.log('⚠️  No OPENCORPORATES_API_TOKEN found in .env');
    console.log('Only GLEIF data will be fetched (free, no token required)\n');
  } else {
    console.log('✓ OpenCorporates API token found\n');
  }

  try {
    // Get all unique clients
    const clients = await getAllClients();

    if (clients.length === 0) {
      console.log('No clients found in database');
      return;
    }

    // Enrich entities
    const enrichments = await enrichClients(clients);
    console.log(`Total enrichments to store: ${enrichments.length}\n`);

    // Update database
    if (enrichments.length > 0) {
      await updateClientEnrichments(enrichments);
    }

    console.log('\n=== Enrichment Complete ===');
    console.log(`Clients processed: ${clients.length}`);
    console.log(`Entities enriched: ${enrichments.length}`);
  } catch (error) {
    console.error('Enrichment failed:', error);
    process.exit(1);
  }
}

main();
