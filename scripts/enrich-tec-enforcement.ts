/**
 * TEC Enforcement Actions Enrichment Script
 *
 * This script enriches lobbyist profiles with Texas Ethics Commission
 * enforcement data from two sources:
 * 1. Delinquent Filer List (CSV download)
 * 2. Sworn Complaint Open Orders (HTML scraping)
 *
 * Data Sources:
 * - https://www.ethics.state.tx.us/search/delinquent/lobby/
 * - https://www.ethics.state.tx.us/enforcement/sworn_complaints/orders/issued/
 *
 * Usage:
 * 1. Ensure .env file has Supabase credentials
 * 2. Run database migration first to add enforcement tables
 * 3. Run: npx tsx scripts/enrich-tec-enforcement.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// Configuration
const DELINQUENT_CSV_URL = 'https://www.ethics.state.tx.us/search/delinquent/lobby/grab_delinqs.php';
const SWORN_COMPLAINTS_URL = 'https://www.ethics.state.tx.us/enforcement/sworn_complaints/orders/issued/';
const BATCH_SIZE = 50;
const REQUEST_DELAY_MS = 1000; // Rate limiting: 1 second between requests

interface DelinquentFiler {
  firstName: string;
  lastName: string;
  fineAmount: number;
  address: string;
}

interface SwornComplaint {
  orderNumber: string;
  respondentName: string;
  dateIssued: string;
  pdfUrl: string;
}

interface EnforcementAction {
  lobbyist_id: string;
  action_type: 'delinquent_filing' | 'sworn_complaint';
  year: number;
  description: string;
  fine_amount?: number;
  order_number?: string;
  pdf_url?: string;
  date_issued: string;
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
 * Uses Levenshtein-like approach
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
 * Fetch and parse delinquent filer CSV data
 */
async function fetchDelinquentFilers(): Promise<DelinquentFiler[]> {
  console.log('Fetching delinquent filer data...');

  try {
    const response = await fetch(DELINQUENT_CSV_URL);
    const csvText = await response.text();

    const lines = csvText.split('\n').filter(line => line.trim());
    const filers: DelinquentFiler[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!;
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));

      if (parts.length >= 4 && parts[0] && parts[1]) {
        filers.push({
          lastName: parts[0],
          firstName: parts[1],
          fineAmount: parseFloat(parts[2]?.replace(/[$,]/g, '') || '0'),
          address: parts[3] || '',
        });
      }
    }

    console.log(`Found ${filers.length} delinquent filers\n`);
    return filers;
  } catch (error) {
    console.error('Error fetching delinquent filers:', error);
    return [];
  }
}

/**
 * Fetch and parse sworn complaint orders from HTML
 */
async function fetchSwornComplaints(): Promise<SwornComplaint[]> {
  console.log('Fetching sworn complaint orders...');

  try {
    const response = await fetch(SWORN_COMPLAINTS_URL);
    const html = await response.text();
    const $ = cheerio.load(html);

    const complaints: SwornComplaint[] = [];

    // Find all table rows (skip headers)
    $('table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 3) {
        const orderCell = $(cells[0]);
        const respondentCell = $(cells[1]);
        const dateCell = $(cells[2]);

        const orderLink = orderCell.find('a');
        const orderNumber = orderLink.text().trim();
        const pdfUrl = orderLink.attr('href') || '';
        const respondentName = respondentCell.text().trim();
        const dateIssued = dateCell.text().trim();

        if (orderNumber && respondentName && dateIssued) {
          complaints.push({
            orderNumber,
            respondentName,
            dateIssued,
            pdfUrl: pdfUrl.startsWith('http') ? pdfUrl : `https://www.ethics.state.tx.us${pdfUrl}`,
          });
        }
      }
    });

    console.log(`Found ${complaints.length} sworn complaint orders\n`);
    return complaints;
  } catch (error) {
    console.error('Error fetching sworn complaints:', error);
    return [];
  }
}

/**
 * Process delinquent filers and create enforcement actions
 */
async function processDelinquentFilers(filers: DelinquentFiler[]): Promise<EnforcementAction[]> {
  console.log('Processing delinquent filers...');
  const actions: EnforcementAction[] = [];
  let matchCount = 0;
  let noMatchCount = 0;

  for (const filer of filers) {
    await delay(100); // Small delay to avoid overwhelming the DB

    const lobbyistId = await findLobbyistByName(filer.firstName, filer.lastName);

    if (lobbyistId) {
      matchCount++;
      actions.push({
        lobbyist_id: lobbyistId,
        action_type: 'delinquent_filing',
        year: new Date().getFullYear(), // Current year (could be improved with actual data)
        description: `Delinquent filing with fine of $${filer.fineAmount}`,
        fine_amount: filer.fineAmount,
        date_issued: new Date().toISOString(),
      });
    } else {
      noMatchCount++;
      console.log(`  No match found for: ${filer.firstName} ${filer.lastName}`);
    }
  }

  console.log(`Matched ${matchCount} filers, ${noMatchCount} no match\n`);
  return actions;
}

/**
 * Process sworn complaints and create enforcement actions
 */
async function processSwornComplaints(complaints: SwornComplaint[]): Promise<EnforcementAction[]> {
  console.log('Processing sworn complaints...');
  const actions: EnforcementAction[] = [];
  let matchCount = 0;
  let noMatchCount = 0;

  for (const complaint of complaints) {
    await delay(100);

    // Parse name (format is usually "FirstName LastName" or "LastName, FirstName")
    let firstName = '';
    let lastName = '';

    if (complaint.respondentName.includes(',')) {
      const parts = complaint.respondentName.split(',').map(p => p.trim());
      lastName = parts[0] || '';
      firstName = parts[1] || '';
    } else {
      const parts = complaint.respondentName.split(' ').map(p => p.trim());
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ');
    }

    if (!firstName || !lastName) continue;

    const lobbyistId = await findLobbyistByName(firstName, lastName);

    if (lobbyistId) {
      matchCount++;

      // Parse year from date (format: MM/DD/YYYY)
      const dateParts = complaint.dateIssued.split('/');
      const year = dateParts[2] ? parseInt(dateParts[2]) : new Date().getFullYear();

      actions.push({
        lobbyist_id: lobbyistId,
        action_type: 'sworn_complaint',
        year,
        description: `Sworn complaint order ${complaint.orderNumber}`,
        order_number: complaint.orderNumber,
        pdf_url: complaint.pdfUrl,
        date_issued: new Date(complaint.dateIssued).toISOString(),
      });
    } else {
      noMatchCount++;
      console.log(`  No match found for: ${complaint.respondentName}`);
    }
  }

  console.log(`Matched ${matchCount} complaints, ${noMatchCount} no match\n`);
  return actions;
}

/**
 * Store enforcement actions in database
 */
async function storeEnforcementActions(actions: EnforcementAction[]): Promise<void> {
  console.log('Storing enforcement actions...');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < actions.length; i += BATCH_SIZE) {
    const batch = actions.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('enforcement_actions')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error inserting batch ${i / BATCH_SIZE + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      console.log(`Stored batch ${i / BATCH_SIZE + 1}: ${data.length} actions`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  console.log(`\nStored ${successCount} actions, ${errorCount} errors\n`);
}

/**
 * Update lobbyist summary fields
 */
async function updateLobbyistSummaries(): Promise<void> {
  console.log('Updating lobbyist summary fields...');

  // Get all lobbyists with enforcement actions
  const { data: lobbyists, error } = await supabase
    .from('lobbyists')
    .select('id');

  if (error || !lobbyists) {
    console.error('Error fetching lobbyists:', error);
    return;
  }

  for (const lobbyist of lobbyists) {
    // Count enforcement actions
    const { data: actions, error: actionsError } = await supabase
      .from('enforcement_actions')
      .select('year')
      .eq('lobbyist_id', lobbyist.id);

    if (actionsError) continue;

    const enforcementCount = actions.length;
    const hasEnforcement = enforcementCount > 0;
    const lastEnforcementYear = hasEnforcement
      ? Math.max(...actions.map(a => a.year))
      : null;

    // Update lobbyist record
    await supabase
      .from('lobbyists')
      .update({
        enforcement_actions_count: enforcementCount,
        has_enforcement_history: hasEnforcement,
        last_enforcement_year: lastEnforcementYear,
      })
      .eq('id', lobbyist.id);
  }

  console.log('Lobbyist summaries updated\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('=== TEC Enforcement Enrichment Script ===\n');
  console.log('Starting enforcement data enrichment...\n');

  try {
    // Fetch data from both sources
    const [delinquentFilers, swornComplaints] = await Promise.all([
      fetchDelinquentFilers(),
      fetchSwornComplaints(),
    ]);

    // Process and match to lobbyists
    const [delinquentActions, complaintActions] = await Promise.all([
      processDelinquentFilers(delinquentFilers),
      processSwornComplaints(swornComplaints),
    ]);

    const allActions = [...delinquentActions, ...complaintActions];
    console.log(`Total enforcement actions to store: ${allActions.length}\n`);

    // Store in database
    if (allActions.length > 0) {
      await storeEnforcementActions(allActions);
      await updateLobbyistSummaries();
    }

    console.log('\n=== Enrichment Complete ===');
    console.log(`Delinquent filers processed: ${delinquentFilers.length}`);
    console.log(`Sworn complaints processed: ${swornComplaints.length}`);
    console.log(`Total actions stored: ${allActions.length}`);
  } catch (error) {
    console.error('Enrichment failed:', error);
    process.exit(1);
  }
}

main();
