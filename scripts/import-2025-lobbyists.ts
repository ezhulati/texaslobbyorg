#!/usr/bin/env tsx

/**
 * 2025 Texas Lobbyist Data Import Script
 *
 * Imports lobbyist data from multiple Excel files provided by Texas Ethics Commission.
 * Handles deduplication, data normalization, and imports lobbyists, clients, and political fund compensation data.
 *
 * Usage:
 *   npx tsx scripts/import-2025-lobbyists.ts               # Run actual import
 *   npx tsx scripts/import-2025-lobbyists.ts --dry-run     # Test without writing to database
 *   npx tsx scripts/import-2025-lobbyists.ts --clear-data  # Clear existing data before import
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import {
  parseExcelFile,
  normalizePhone,
  normalizeEmail,
  parseArrayField,
  generateUniqueSlug,
  normalizeName,
  parseTECName,
  deduplicateLobbyists,
  batchInsert,
  createServiceClient,
  writeErrorReport,
  logSummary,
} from './import-utils';
import {
  FILE_MAPPINGS,
  getColumnValue,
  getArrayColumnValue,
  validateColumns,
  DATA_DIR,
  DEFAULT_BATCH_SIZE,
  IMPORT_YEAR,
  type ColumnMapping,
} from './import-config';
import type { Database } from '../src/lib/database.types';

// Load environment variables
config();

type LobbyistInsert = Database['public']['Tables']['lobbyists']['Insert'];
type ClientInsert = Database['public']['Tables']['clients']['Insert'];
type PoliticalFundCompensationInsert =
  Database['public']['Tables']['political_fund_compensations']['Insert'];

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const CLEAR_DATA = args.includes('--clear-data');

// Statistics tracking
const stats = {
  totalFiles: 0,
  totalRows: 0,
  lobbyistsImported: 0,
  lobbyistsUpdated: 0,
  clientsImported: 0,
  politicalFundsImported: 0,
  errors: 0,
  startTime: Date.now(),
};

const allErrors: any[] = [];
const allLobbyists: Partial<LobbyistInsert>[] = [];
const allClients: { lobbyistSlug: string; client: Partial<ClientInsert> }[] = [];
const allPoliticalFunds: {
  lobbyistSlug: string;
  fund: Partial<PoliticalFundCompensationInsert>;
}[] = [];

// Subject area accumulator: key = "firstName-lastName", value = Set of subject areas
const subjectAreaMap = new Map<string, Set<string>>();

/**
 * Main import function
 */
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🏛️  Texas Lobbyist Data Import - 2025');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No database changes will be made\n');
  }

  if (CLEAR_DATA && !DRY_RUN) {
    console.log('⚠️  CLEAR DATA MODE - Existing data will be deleted\n');
  }

  // Create Supabase client (only if not dry-run)
  let supabase: any = null;
  if (!DRY_RUN) {
    try {
      supabase = createServiceClient();
      console.log('✓ Connected to Supabase\n');
    } catch (error: any) {
      console.error('❌ Failed to connect to Supabase:', error.message);
      process.exit(1);
    }
  } else {
    console.log('⚠️  Skipping Supabase connection (dry-run mode)\n');
  }

  // Phase 1: Parse all Excel files
  console.log('📂 Phase 1: Parsing Excel files...\n');

  for (const mapping of FILE_MAPPINGS) {
    const filePath = path.join(process.cwd(), mapping.sourceFile);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${mapping.sourceFile} - file not found`);
      continue;
    }

    try {
      console.log(`📄 Processing: ${path.basename(mapping.sourceFile)}`);
      console.log(`   ${mapping.description}`);

      const rows = parseExcelFile(filePath);
      console.log(`   Rows: ${rows.length}`);

      stats.totalFiles++;
      stats.totalRows += rows.length;

      // Validate columns exist
      if (rows.length > 0) {
        const actualColumns = Object.keys(rows[0]);
        const missingColumns = validateColumns(mapping, actualColumns);

        if (missingColumns.length > 0) {
          console.log(`   ⚠️  Missing columns: ${missingColumns.join(', ')}`);
          console.log(`   Available columns: ${actualColumns.join(', ')}`);
          console.log(`   Skipping this file\n`);
          continue;
        }
      }

      // Process rows based on file type
      await processFile(rows, mapping, supabase);
      console.log(`   ✓ Processed successfully\n`);
    } catch (error: any) {
      console.error(`   ❌ Error processing ${mapping.sourceFile}:`, error.message);
      allErrors.push({
        file: mapping.sourceFile,
        error: error.message,
      });
      stats.errors++;
    }
  }

  // Phase 2: Deduplicate lobbyists
  console.log('🔄 Phase 2: Deduplicating lobbyists...\n');
  const uniqueLobbyists = deduplicateLobbyists(allLobbyists);
  console.log(`   Found ${allLobbyists.length} total records`);
  console.log(`   Deduplicated to ${uniqueLobbyists.length} unique lobbyists\n`);

  // Phase 2.5: Merge accumulated subject areas
  if (subjectAreaMap.size > 0) {
    console.log('📚 Phase 2.5: Merging subject areas...\n');
    for (const lobbyist of uniqueLobbyists) {
      if (!lobbyist.first_name || !lobbyist.last_name) continue;

      const key = `${lobbyist.first_name.toLowerCase()}-${lobbyist.last_name.toLowerCase()}`;
      const subjects = subjectAreaMap.get(key);

      if (subjects && subjects.size > 0) {
        // Merge with existing subject areas
        const existing = lobbyist.subject_areas || [];
        lobbyist.subject_areas = Array.from(new Set([...existing, ...subjects]));
      }
    }
    console.log(`   ✓ Merged subject areas for ${subjectAreaMap.size} lobbyists\n`);
  }

  // Phase 3: Generate slugs
  // Skip database checks if we're clearing data (no collisions possible)
  if (!DRY_RUN && !CLEAR_DATA) {
    console.log('🔗 Phase 3: Generating unique slugs (checking database for collisions)...\n');
    for (const lobbyist of uniqueLobbyists) {
      if (!lobbyist.first_name || !lobbyist.last_name) continue;

      lobbyist.slug = await generateUniqueSlug(
        lobbyist.first_name,
        lobbyist.last_name,
        supabase
      );
    }
    console.log(`   ✓ Generated ${uniqueLobbyists.length} unique slugs\n`);
  } else {
    // In dry-run or clear-data mode, just create simple slugs without checking database
    console.log('🔗 Phase 3: Generating slugs...\n');
    for (const lobbyist of uniqueLobbyists) {
      if (!lobbyist.first_name || !lobbyist.last_name) continue;

      lobbyist.slug = `${lobbyist.first_name.toLowerCase()}-${lobbyist.last_name.toLowerCase()}`
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    console.log(`   ✓ Generated ${uniqueLobbyists.length} slugs\n`);
  }

  if (DRY_RUN) {
    // Dry run summary
    console.log('📊 DRY RUN SUMMARY:');
    console.log(`   Would import ${uniqueLobbyists.length} lobbyists`);
    console.log(`   Would import ${allClients.length} client relationships`);
    console.log(`   Would import ${allPoliticalFunds.length} political fund records`);
    console.log(`   Files processed: ${stats.totalFiles}`);
    console.log(`   Total rows: ${stats.totalRows}`);
    console.log(`   Errors: ${stats.errors}\n`);

    // Show sample lobbyist
    if (uniqueLobbyists.length > 0) {
      console.log('Sample lobbyist record:');
      console.log(JSON.stringify(uniqueLobbyists[0], null, 2));
    }

    return;
  }

  // Phase 4: Clear existing data (if requested)
  if (CLEAR_DATA) {
    console.log('🗑️  Phase 4: Clearing existing data...\n');

    try {
      // Delete in correct order (respecting foreign keys)
      await supabase.from('political_fund_compensations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('   ✓ Cleared political_fund_compensations');

      await supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('   ✓ Cleared clients');

      await supabase.from('favorites').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('   ✓ Cleared favorites');

      await supabase.from('page_views').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log('   ✓ Cleared page_views');

      // Only delete unclaimed lobbyists (preserve claimed profiles)
      await supabase.from('lobbyists').delete().eq('is_claimed', false);
      console.log('   ✓ Cleared unclaimed lobbyists (preserved claimed profiles)\n');
    } catch (error: any) {
      console.error('   ❌ Error clearing data:', error.message);
      process.exit(1);
    }
  }

  // Phase 5: Import lobbyists
  console.log('📥 Phase 5: Importing lobbyists...\n');
  const lobbyistResult = await batchInsert(
    supabase,
    'lobbyists',
    uniqueLobbyists,
    DEFAULT_BATCH_SIZE
  );

  stats.lobbyistsImported = lobbyistResult.success;
  stats.errors += lobbyistResult.errors;
  allErrors.push(...lobbyistResult.errorDetails);

  console.log(`   ✓ Imported ${lobbyistResult.success} lobbyists`);
  if (lobbyistResult.errors > 0) {
    console.log(`   ⚠️  ${lobbyistResult.errors} errors\n`);
  } else {
    console.log('');
  }

  // Phase 6: Import clients
  if (allClients.length > 0) {
    console.log('📥 Phase 6: Importing client relationships...\n');

    // Fetch all lobbyist IDs and slugs in one query for O(1) lookups
    const { data: lobbyists } = await supabase
      .from('lobbyists')
      .select('id, slug');

    if (!lobbyists) {
      console.error('   ❌ Failed to fetch lobbyist IDs');
      process.exit(1);
    }

    // Create slug -> ID map for fast lookups
    const slugToIdMap = new Map<string, string>();
    for (const lobbyist of lobbyists) {
      slugToIdMap.set(lobbyist.slug, lobbyist.id);
    }

    console.log(`   ✓ Loaded ${slugToIdMap.size} lobbyist IDs`);

    // Map client records to include lobbyist_id
    const clientsWithIds: ClientInsert[] = [];
    for (const { lobbyistSlug, client } of allClients) {
      const lobbyistId = slugToIdMap.get(lobbyistSlug);

      if (lobbyistId) {
        clientsWithIds.push({
          ...client,
          lobbyist_id: lobbyistId,
        } as ClientInsert);
      }
    }

    const clientResult = await batchInsert(
      supabase,
      'clients',
      clientsWithIds,
      DEFAULT_BATCH_SIZE
    );

    stats.clientsImported = clientResult.success;
    stats.errors += clientResult.errors;
    allErrors.push(...clientResult.errorDetails);

    console.log(`   ✓ Imported ${clientResult.success} client relationships`);
    if (clientResult.errors > 0) {
      console.log(`   ⚠️  ${clientResult.errors} errors\n`);
    } else {
      console.log('');
    }
  }

  // Phase 7: Import political fund compensations
  if (allPoliticalFunds.length > 0) {
    console.log('📥 Phase 7: Importing political fund compensations...\n');

    // Fetch all lobbyist IDs and slugs in one query for O(1) lookups
    const { data: lobbyists } = await supabase
      .from('lobbyists')
      .select('id, slug');

    if (!lobbyists) {
      console.error('   ❌ Failed to fetch lobbyist IDs');
      process.exit(1);
    }

    // Create slug -> ID map for fast lookups
    const slugToIdMap = new Map<string, string>();
    for (const lobbyist of lobbyists) {
      slugToIdMap.set(lobbyist.slug, lobbyist.id);
    }

    // Map fund records to include lobbyist_id
    const fundsWithIds: PoliticalFundCompensationInsert[] = [];
    for (const { lobbyistSlug, fund } of allPoliticalFunds) {
      const lobbyistId = slugToIdMap.get(lobbyistSlug);

      if (lobbyistId) {
        fundsWithIds.push({
          ...fund,
          lobbyist_id: lobbyistId,
        } as PoliticalFundCompensationInsert);
      }
    }

    const fundResult = await batchInsert(
      supabase,
      'political_fund_compensations',
      fundsWithIds,
      DEFAULT_BATCH_SIZE
    );

    stats.politicalFundsImported = fundResult.success;
    stats.errors += fundResult.errors;
    allErrors.push(...fundResult.errorDetails);

    console.log(`   ✓ Imported ${fundResult.success} political fund records`);
    if (fundResult.errors > 0) {
      console.log(`   ⚠️  ${fundResult.errors} errors\n`);
    } else {
      console.log('');
    }
  }

  // Write error report if errors occurred
  if (allErrors.length > 0) {
    const errorReportPath = path.join(process.cwd(), 'import-errors.csv');
    writeErrorReport(allErrors, errorReportPath);
  }

  // Final summary
  const duration = Date.now() - stats.startTime;
  logSummary({
    totalFiles: stats.totalFiles,
    totalRows: stats.totalRows,
    lobbyistsImported: stats.lobbyistsImported,
    clientsImported: stats.clientsImported,
    politicalFundsImported: stats.politicalFundsImported,
    errors: stats.errors,
    duration,
  });

  console.log('✅ Import complete!\n');
}

/**
 * Process rows from a single Excel file
 */
async function processFile(
  rows: any[],
  mapping: ColumnMapping,
  supabase: any
): Promise<void> {
  for (const row of rows) {
    // Skip row if skipRow function returns true
    if (mapping.skipRow && mapping.skipRow(row)) {
      continue;
    }

    // Parse lobbyist name
    let firstName: string;
    let lastName: string;

    if (mapping.parseFullName) {
      // Parse "Last, First (Title)" format
      const fullName = getColumnValue(row, mapping.columns.fullName);
      const parsed = parseTECName(fullName);

      if (!parsed) {
        continue; // Skip rows with unparseable names
      }

      firstName = parsed.firstName;
      lastName = parsed.lastName;
    } else {
      // Use separate first/last name columns
      firstName = normalizeName(getColumnValue(row, mapping.columns.firstName));
      lastName = normalizeName(getColumnValue(row, mapping.columns.lastName));
    }

    if (!firstName || !lastName) {
      continue; // Skip rows without required fields
    }

    // Handle subject areas
    let subjectAreas: string[] = [];

    if (mapping.subjectAreaPerRow) {
      // This file has one subject per row (2025LobbySubjMatter.xlsx)
      // Accumulate subjects in a map, then merge later
      const subjectArea = getColumnValue(row, mapping.columns.subjectArea);
      if (subjectArea && subjectArea.trim()) {
        const key = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;
        if (!subjectAreaMap.has(key)) {
          subjectAreaMap.set(key, new Set());
        }
        subjectAreaMap.get(key)!.add(subjectArea.trim());
      }
      // Subject areas will be merged later in Phase 2.5
    }

    // Build lobbyist record
    const lobbyist: Partial<LobbyistInsert> = {
      first_name: firstName,
      last_name: lastName,
      phone: normalizePhone(getColumnValue(row, mapping.columns.phone)),
      bio: getColumnValue(row, mapping.columns.business) || null, // Use business as initial bio
      cities: [], // Will be populated from city column
      subject_areas: subjectAreas,
      is_active: true,
      is_claimed: false,
      subscription_tier: 'free',
      view_count: 0,
    };

    // Handle city (single value, not array in TEC files)
    const city = getColumnValue(row, mapping.columns.city);
    if (city && city.trim()) {
      lobbyist.cities = [city.trim()];
    }

    // Apply custom transformations
    if (mapping.transformations) {
      for (const [field, transform] of Object.entries(mapping.transformations)) {
        if (field in lobbyist) {
          (lobbyist as any)[field] = transform((lobbyist as any)[field], row);
        }
      }
    }

    allLobbyists.push(lobbyist);

    // Extract client relationship if present
    const clientName = getColumnValue(row, mapping.columns.clientName);
    if (clientName && clientName.trim()) {
      const tempSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;

      // Apply transformations to year fields if they exist
      let yearStarted = getColumnValue(row, mapping.columns.yearStarted);
      let yearEnded = getColumnValue(row, mapping.columns.yearEnded);

      if (mapping.transformations?.yearStarted) {
        yearStarted = mapping.transformations.yearStarted(yearStarted, row);
      }

      if (mapping.transformations?.yearEnded) {
        yearEnded = mapping.transformations.yearEnded(yearEnded, row);
      }

      allClients.push({
        lobbyistSlug: tempSlug,
        client: {
          name: clientName.trim(),
          year_started: yearStarted,
          year_ended: yearEnded,
          is_current: true,
        },
      });
    }

    // Extract political fund compensation if present
    const fundName = getColumnValue(row, mapping.columns.fundName);
    if (fundName && fundName.trim()) {
      const tempSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;

      allPoliticalFunds.push({
        lobbyistSlug: tempSlug,
        fund: {
          fund_name: fundName.trim(),
          year: IMPORT_YEAR,
          amount: null, // TEC doesn't provide amounts in this dataset
        },
      });
    }
  }
}

/**
 * Run the import
 */
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
