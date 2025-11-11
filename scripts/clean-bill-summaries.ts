/**
 * Clean up bill summaries by removing preamble text
 * Removes phrases like "Here's a summary of the bill:", "Here's a summary:", etc.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const PREAMBLE_PATTERNS = [
  /^Here's a summary of the (Texas )?bill:[\s\n]*/i,
  /^Here's a concise summary:[\s\n]*/i,
  /^Here's a summary:[\s\n]*/i,
  /^Summary:[\s\n]*/i,
  /^Here is a summary:[\s\n]*/i,
  /^Here is a concise summary:[\s\n]*/i,
  /^This bill\s+/i, // Remove "This bill" at start
  /^The bill\s+/i, // Remove "The bill" at start
];

async function cleanSummaries(dryRun: boolean = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Bill Summary Cleanup Script');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no database updates)' : 'LIVE (will update database)'}`);
  console.log(`${'='.repeat(60)}\n`);

  let cleanedCount = 0;
  let unchangedCount = 0;
  let offset = 0;
  const batchSize = 1000;

  // Process all bills in batches
  while (true) {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('id, bill_number, summary')
      .not('summary', 'is', null)
      .order('bill_number')
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error fetching bills:', error);
      return;
    }

    if (!bills || bills.length === 0) break;

    console.log(`\nProcessing batch ${offset}-${offset + bills.length}...`);

    for (const bill of bills) {
    if (!bill.summary) continue;

    let cleaned = bill.summary;
    let wasModified = false;

    // Try each pattern
    for (const pattern of PREAMBLE_PATTERNS) {
      const newCleaned = cleaned.replace(pattern, '');
      if (newCleaned !== cleaned) {
        cleaned = newCleaned;
        wasModified = true;
      }
    }

    // Capitalize first letter after cleaning
    if (wasModified && cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    if (wasModified) {
      console.log(`\n${bill.bill_number}:`);
      console.log(`Before: "${bill.summary.substring(0, 80)}..."`);
      console.log(`After:  "${cleaned.substring(0, 80)}..."`);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('bills')
          .update({ summary: cleaned })
          .eq('id', bill.id);

        if (updateError) {
          console.log(`❌ Failed to update: ${updateError.message}`);
        } else {
          console.log('✅ Updated');
          cleanedCount++;
        }
      } else {
        console.log('🔍 DRY RUN - would update');
        cleanedCount++;
      }
    } else {
      unchangedCount++;
    }
    }

    if (bills.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary Cleanup Complete');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Cleaned: ${cleanedCount}`);
  console.log(`⏭️  Unchanged: ${unchangedCount}`);
  console.log(`📊 Total processed: ${cleanedCount + unchangedCount}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRunArg = args.includes('--dry-run');

console.log('\nUsage:');
console.log('  npx tsx scripts/clean-bill-summaries.ts [options]');
console.log('\nOptions:');
console.log('  --dry-run     Test mode, no database updates');
console.log('\nExamples:');
console.log('  npx tsx scripts/clean-bill-summaries.ts --dry-run');
console.log('  npx tsx scripts/clean-bill-summaries.ts\n');

cleanSummaries(dryRunArg).catch(console.error);
