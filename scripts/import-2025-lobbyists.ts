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

  // Create Supabase client
  const supabase = createServiceClient();
  console.log('✓ Connected to Supabase\n');

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

  // Phase 3: Generate slugs
  console.log('🔗 Phase 3: Generating unique slugs...\n');
  for (const lobbyist of uniqueLobbyists) {
    if (!lobbyist.first_name || !lobbyist.last_name) continue;

    lobbyist.slug = await generateUniqueSlug(
      lobbyist.first_name,
      lobbyist.last_name,
      supabase
    );
  }
  console.log(`   ✓ Generated ${uniqueLobbyists.length} unique slugs\n`);

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

    // Need to fetch lobbyist IDs by slug
    const clientsWithIds: ClientInsert[] = [];

    for (const { lobbyistSlug, client } of allClients) {
      const { data: lobbyist } = await supabase
        .from('lobbyists')
        .select('id')
        .eq('slug', lobbyistSlug)
        .single();

      if (lobbyist) {
        clientsWithIds.push({
          ...client,
          lobbyist_id: lobbyist.id,
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

    // Need to fetch lobbyist IDs by slug
    const fundsWithIds: PoliticalFundCompensationInsert[] = [];

    for (const { lobbyistSlug, fund } of allPoliticalFunds) {
      const { data: lobbyist } = await supabase
        .from('lobbyists')
        .select('id')
        .eq('slug', lobbyistSlug)
        .single();

      if (lobbyist) {
        fundsWithIds.push({
          ...fund,
          lobbyist_id: lobbyist.id,
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

    // Extract lobbyist data
    const firstName = normalizeName(getColumnValue(row, mapping.columns.firstName));
    const lastName = normalizeName(getColumnValue(row, mapping.columns.lastName));

    if (!firstName || !lastName) {
      continue; // Skip rows without required fields
    }

    // Build lobbyist record
    const lobbyist: Partial<LobbyistInsert> = {
      first_name: firstName,
      last_name: lastName,
      email: normalizeEmail(getColumnValue(row, mapping.columns.email)),
      phone: normalizePhone(getColumnValue(row, mapping.columns.phone)),
      website: getColumnValue(row, mapping.columns.website),
      cities: getArrayColumnValue(row, mapping.columns.cities, parseArrayField),
      subject_areas: getArrayColumnValue(
        row,
        mapping.columns.subjectAreas,
        parseArrayField
      ),
      is_active: true,
      is_claimed: false,
      subscription_tier: 'free',
      view_count: 0,
    };

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
    if (clientName) {
      // We'll need the slug later, so generate a temporary one
      const tempSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;

      allClients.push({
        lobbyistSlug: tempSlug,
        client: {
          name: clientName,
          description: getColumnValue(row, mapping.columns.clientDescription),
          year_started: getColumnValue(row, mapping.columns.yearStarted)
            ? parseInt(getColumnValue(row, mapping.columns.yearStarted))
            : null,
          year_ended: getColumnValue(row, mapping.columns.yearEnded)
            ? parseInt(getColumnValue(row, mapping.columns.yearEnded))
            : null,
          is_current: true,
        },
      });
    }

    // Extract political fund compensation if present
    const fundName = getColumnValue(row, mapping.columns.fundName);
    if (fundName) {
      const tempSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;

      let amount = getColumnValue(row, mapping.columns.compensationAmount);
      if (mapping.transformations?.compensationAmount) {
        amount = mapping.transformations.compensationAmount(amount, row);
      }

      allPoliticalFunds.push({
        lobbyistSlug: tempSlug,
        fund: {
          fund_name: fundName,
          contributor_name: getColumnValue(row, mapping.columns.contributorName),
          year: getColumnValue(row, mapping.columns.compensationYear)
            ? parseInt(getColumnValue(row, mapping.columns.compensationYear))
            : IMPORT_YEAR,
          amount,
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
