/**
 * Texas State Procurement Data Enrichment Script
 *
 * This script enriches client profiles with state contract and procurement data
 * from Texas Open Data Portal (Socrata platform) and other state sources.
 *
 * Data Sources:
 * - Texas Open Data Portal: https://data.texas.gov
 * - TCEQ Contracts: https://data.texas.gov/resource/svjm-sdfz.json
 * - DIR Cooperative Contracts: https://data.texas.gov/resource/4v6c-qfkr.json
 * - LBB Contracts Database: https://contracts.lbb.texas.gov (manual export)
 *
 * Purpose:
 * - Track state contract awards to lobbyist clients
 * - Build "contracts won while represented" dataset
 * - Provide transparency and ROI metrics for lobbying services
 * - Identify high-value clients and contract patterns
 *
 * Usage:
 * 1. Ensure .env file has Supabase credentials
 * 2. Run database migration first to add client_contracts table
 * 3. Run: npx tsx scripts/enrich-procurement.ts
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const TEXAS_DATA_PORTAL_BASE = 'https://data.texas.gov/resource';
const BATCH_SIZE = 50;
const REQUEST_DELAY_MS = 1000; // 1 second between requests
const MAX_RECORDS = 50000; // Socrata default max

// Dataset IDs for procurement data
const DATASETS = [
  {
    id: 'svjm-sdfz',
    name: 'TCEQ Contracts & Purchase Orders',
    vendorField: 'vendor',
    amountField: 'amount',
    dateField: 'award_date',
    titleField: 'description',
    agencyField: 'agency',
  },
  // Additional datasets can be added here as they're discovered
  // {
  //   id: '4v6c-qfkr',
  //   name: 'DIR Cooperative Contracts Customers',
  //   vendorField: 'customer_name',
  //   amountField: 'sales_amount',
  //   dateField: 'report_date',
  //   titleField: 'contract_number',
  //   agencyField: 'agency_name',
  // },
];

interface ContractRecord {
  vendor?: string;
  amount?: string | number;
  award_date?: string;
  description?: string;
  agency?: string;
  contract_number?: string;
  [key: string]: any; // Flexible for different dataset schemas
}

interface ClientContract {
  client_name: string;
  contract_title: string;
  agency: string;
  amount: number | null;
  award_date: string | null;
  source_dataset: string;
  raw_data: any;
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
 * Normalize company name for matching
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b\.?/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse amount from various formats
 */
function parseAmount(amount: string | number | null | undefined): number | null {
  if (!amount) return null;

  const str = String(amount).replace(/[$,]/g, '');
  const parsed = parseFloat(str);

  return isNaN(parsed) ? null : parsed;
}

/**
 * Fetch contracts from a Socrata dataset
 */
async function fetchContracts(
  datasetId: string,
  datasetName: string,
  offset: number = 0
): Promise<ContractRecord[]> {
  try {
    const url = `${TEXAS_DATA_PORTAL_BASE}/${datasetId}.json?$limit=${MAX_RECORDS}&$offset=${offset}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Error fetching ${datasetName}: ${response.status}`);
      return [];
    }

    const records: ContractRecord[] = await response.json();
    return records;
  } catch (error) {
    console.error(`Error fetching contracts from ${datasetName}:`, error);
    return [];
  }
}

/**
 * Get all unique client names from database
 */
async function getAllClientNames(): Promise<Set<string>> {
  console.log('Fetching all client names...');

  const { data: clients, error } = await supabase
    .from('clients')
    .select('name');

  if (error) {
    console.error('Error fetching clients:', error);
    return new Set();
  }

  const names = new Set<string>();
  for (const client of clients || []) {
    names.add(normalizeCompanyName(client.name));
  }

  console.log(`Found ${names.size} unique client names\n`);
  return names;
}

/**
 * Match contracts to known clients
 */
function matchContractsToClients(
  contracts: ContractRecord[],
  clientNames: Set<string>,
  dataset: typeof DATASETS[0]
): ClientContract[] {
  const matches: ClientContract[] = [];

  for (const contract of contracts) {
    const vendorName = contract[dataset.vendorField];
    if (!vendorName) continue;

    const normalizedVendor = normalizeCompanyName(String(vendorName));

    // Check if this vendor matches any of our clients
    if (clientNames.has(normalizedVendor)) {
      matches.push({
        client_name: String(vendorName),
        contract_title: String(contract[dataset.titleField] || 'Untitled Contract'),
        agency: String(contract[dataset.agencyField] || dataset.name),
        amount: parseAmount(contract[dataset.amountField]),
        award_date: contract[dataset.dateField] ? String(contract[dataset.dateField]) : null,
        source_dataset: dataset.name,
        raw_data: contract,
      });
    }
  }

  return matches;
}

/**
 * Process all datasets and find matching contracts
 */
async function processAllDatasets(clientNames: Set<string>): Promise<ClientContract[]> {
  console.log('Processing procurement datasets...\n');
  const allMatches: ClientContract[] = [];

  for (const dataset of DATASETS) {
    console.log(`\n--- Processing: ${dataset.name} ---`);

    try {
      // Fetch contracts from this dataset
      const contracts = await fetchContracts(dataset.id, dataset.name);
      console.log(`Fetched ${contracts.length} contract records`);

      // Match to our clients
      const matches = matchContractsToClients(contracts, clientNames, dataset);
      console.log(`Found ${matches.length} matches to known clients`);

      allMatches.push(...matches);

      // Rate limiting
      await delay(REQUEST_DELAY_MS);
    } catch (error) {
      console.error(`Error processing ${dataset.name}:`, error);
    }
  }

  return allMatches;
}

/**
 * Store client contracts in database
 */
async function storeClientContracts(contracts: ClientContract[]): Promise<void> {
  console.log('\nStoring client contracts...');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < contracts.length; i += BATCH_SIZE) {
    const batch = contracts.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('client_contracts')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      console.log(`Stored batch ${i / BATCH_SIZE + 1}: ${data.length} contracts`);
    }

    await delay(500);
  }

  console.log(`\nStored ${successCount} contracts, ${errorCount} errors\n`);
}

/**
 * Generate summary statistics
 */
function generateSummary(contracts: ClientContract[]): void {
  console.log('\n=== Procurement Data Summary ===');

  // Total contracts and value
  const totalContracts = contracts.length;
  const totalValue = contracts
    .filter(c => c.amount !== null)
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  console.log(`Total contracts matched: ${totalContracts}`);
  console.log(`Total contract value: $${totalValue.toLocaleString()}`);

  // By agency
  const byAgency = new Map<string, number>();
  for (const contract of contracts) {
    const count = byAgency.get(contract.agency) || 0;
    byAgency.set(contract.agency, count + 1);
  }

  console.log(`\nContracts by agency:`);
  for (const [agency, count] of Array.from(byAgency.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${agency}: ${count}`);
  }

  // By year
  const byYear = new Map<string, number>();
  for (const contract of contracts) {
    if (contract.award_date) {
      const year = new Date(contract.award_date).getFullYear().toString();
      const count = byYear.get(year) || 0;
      byYear.set(year, count + 1);
    }
  }

  console.log(`\nContracts by year:`);
  for (const [year, count] of Array.from(byYear.entries()).sort()) {
    console.log(`  ${year}: ${count}`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Texas Procurement Data Enrichment Script ===\n');

  try {
    // Get all client names
    const clientNames = await getAllClientNames();

    if (clientNames.size === 0) {
      console.log('No clients found in database');
      return;
    }

    // Process all datasets
    const contracts = await processAllDatasets(clientNames);
    console.log(`\nTotal contracts matched across all datasets: ${contracts.length}\n`);

    if (contracts.length === 0) {
      console.log('No contract matches found');
      return;
    }

    // Generate summary
    generateSummary(contracts);

    // Store in database
    await storeClientContracts(contracts);

    console.log('\n=== Enrichment Complete ===');
  } catch (error) {
    console.error('Enrichment failed:', error);
    process.exit(1);
  }
}

main();
