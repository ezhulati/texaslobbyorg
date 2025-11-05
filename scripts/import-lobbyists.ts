/**
 * CSV Import Script for Lobbyist Data
 *
 * This script imports lobbyist data from a CSV file exported from
 * the Texas Ethics Commission database into Supabase.
 *
 * Expected CSV format:
 * FirstName,LastName,Email,Phone,Cities,SubjectAreas
 *
 * Usage:
 * 1. Place your CSV file at: data/lobbyists.csv
 * 2. Set up your .env file with Supabase credentials
 * 3. Run: npx tsx scripts/import-lobbyists.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Configuration
const CSV_FILE_PATH = 'data/lobbyists.csv';
const BATCH_SIZE = 50;

interface CSVRow {
  FirstName: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Cities?: string; // Comma-separated list
  SubjectAreas?: string; // Comma-separated list
}

interface LobbyistInsert {
  first_name: string;
  last_name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  cities: string[];
  subject_areas: string[];
  is_active: boolean;
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
 * Generate URL-friendly slug from name
 */
function generateSlug(firstName: string, lastName: string): string {
  const fullName = `${firstName} ${lastName}`;
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse CSV file manually (simple implementation)
 */
function parseCSV(filePath: string): CSVRow[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const lines = fileContent.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headers = lines[0]!.split(',').map(h => h.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]!.split(',').map(v => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || undefined;
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

/**
 * Transform CSV row to Supabase insert format
 */
function transformRow(row: CSVRow): LobbyistInsert {
  return {
    first_name: row.FirstName,
    last_name: row.LastName,
    slug: generateSlug(row.FirstName, row.LastName),
    email: row.Email || null,
    phone: row.Phone || null,
    cities: row.Cities ? row.Cities.split(';').map(c => c.trim()) : [],
    subject_areas: row.SubjectAreas ? row.SubjectAreas.split(';').map(s => s.trim()) : [],
    is_active: true,
  };
}

/**
 * Import lobbyists in batches
 */
async function importLobbyists(lobbyists: LobbyistInsert[]): Promise<void> {
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < lobbyists.length; i += BATCH_SIZE) {
    const batch = lobbyists.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from('lobbyists')
      .insert(batch)
      .select();

    if (error) {
      console.error(`Error importing batch ${i / BATCH_SIZE + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += data.length;
      console.log(`Imported batch ${i / BATCH_SIZE + 1}: ${data.length} lobbyists`);
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total processed: ${lobbyists.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('Starting lobbyist data import...\n');

  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`CSV file not found at: ${CSV_FILE_PATH}`);
    console.error('Please create a CSV file with lobbyist data.');
    console.error('\nExpected format:');
    console.error('FirstName,LastName,Email,Phone,Cities,SubjectAreas');
    console.error('John,Doe,john@example.com,512-555-0100,Austin;Dallas,Healthcare;Energy');
    process.exit(1);
  }

  try {
    // Parse CSV
    console.log(`Reading CSV from: ${CSV_FILE_PATH}`);
    const rows = parseCSV(CSV_FILE_PATH);
    console.log(`Found ${rows.length} rows\n`);

    // Transform data
    const lobbyists = rows.map(transformRow);

    // Import to Supabase
    await importLobbyists(lobbyists);

    console.log('\nImport complete!');
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

main();
