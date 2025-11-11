/**
 * Generate real summaries for bills by reading their full text
 * Uses Anthropic Claude API to create concise, meaningful summaries
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

if (!anthropicKey) {
  console.error('ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: anthropicKey });

interface Bill {
  id: string;
  bill_number: string;
  title: string;
  summary: string | null;
  full_text: string | null;
}

const PREAMBLE_PATTERNS = [
  /^Here's a summary of the (Texas )?bill:[\s\n]*/i,
  /^Here's a concise summary:[\s\n]*/i,
  /^Here's a summary:[\s\n]*/i,
  /^Summary:[\s\n]*/i,
  /^Here is a summary:[\s\n]*/i,
  /^Here is a concise summary:[\s\n]*/i,
  /^This bill\s+/i,
  /^The bill\s+/i,
];

function cleanPreamble(text: string): string {
  let cleaned = text.trim();

  // Apply each preamble pattern
  for (const pattern of PREAMBLE_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Capitalize first letter after cleaning
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

async function generateSummary(billText: string, billTitle: string): Promise<string> {
  // Truncate very long bill text to stay within token limits
  const maxChars = 50000; // ~12,500 tokens
  const truncatedText = billText.length > maxChars
    ? billText.substring(0, maxChars) + '\n\n[Text truncated for length]'
    : billText;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 200,
    system: 'You are a bill summarizer. Write ONLY the summary content. Do NOT include any preamble, introduction, or phrases like "Here\'s a summary" or "This bill". Start directly with what the bill does.',
    messages: [{
      role: 'user',
      content: `Summarize this Texas bill in 2-3 sentences (~100-150 words). Explain what it does, who it affects, and its impact. Use plain language for business owners and citizens.

IMPORTANT: Write ONLY the summary. Do NOT start with "Here's a summary" or "This bill" or any introduction.

Bill Title: ${billTitle}

Bill Text:
${truncatedText}`
    }]
  });

  const summary = response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : '';

  // Clean any preambles that still slip through
  return cleanPreamble(summary);
}

async function processBills(limit: number = 10, dryRun: boolean = false) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Bill Summary Generation Script');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no database updates)' : 'LIVE (will update database)'}`);
  console.log(`Batch size: ${limit} bills`);
  console.log(`${'='.repeat(60)}\n`);

  // Get bills that need summaries
  const { data: allBills, error } = await supabase
    .from('bills')
    .select('id, bill_number, title, summary, full_text')
    .not('full_text', 'is', null)
    .order('bill_number');

  if (error) {
    console.error('Error fetching bills:', error);
    return;
  }

  // Filter in memory for bills that need summaries
  const bills = (allBills || [])
    .filter((b: Bill) => {
      if (!b.summary || b.summary.trim() === '') return true;
      const lowerSummary = b.summary.toLowerCase();
      return lowerSummary.startsWith('relating to') && b.summary.length < 200; // Increased threshold
    })
    .slice(0, limit);

  if (!bills || bills.length === 0) {
    console.log('No bills need summaries!');
    return;
  }

  console.log(`Found ${bills.length} bills to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i] as Bill;

    console.log(`\n[${i + 1}/${bills.length}] Processing ${bill.bill_number}...`);
    console.log(`Title: ${bill.title.substring(0, 80)}...`);
    console.log(`Current summary: ${bill.summary?.substring(0, 80)}...`);

    if (!bill.full_text) {
      console.log('❌ No full text available, skipping');
      errorCount++;
      continue;
    }

    try {
      const newSummary = await generateSummary(bill.full_text, bill.title);

      console.log(`\n✨ Generated summary (${newSummary.length} chars):`);
      console.log(`"${newSummary}"`);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('bills')
          .update({ summary: newSummary })
          .eq('id', bill.id);

        if (updateError) {
          console.log(`❌ Failed to update database: ${updateError.message}`);
          errorCount++;
        } else {
          console.log('✅ Database updated');
          successCount++;
        }
      } else {
        console.log('🔍 DRY RUN - would update database');
        successCount++;
      }

      // Rate limiting: wait 1 second between requests
      if (i < bills.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.log(`❌ Error generating summary: ${error}`);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Summary Generation Complete');
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${bills.length}`);

  const { data: remaining } = await supabase
    .from('bills')
    .select('id', { count: 'exact', head: true })
    .not('full_text', 'is', null)
    .or('summary.is.null,and(summary.like.relating to%,summary.length().lt.100)');

  console.log(`📝 Remaining bills needing summaries: ${remaining?.length || 'unknown'}`);
  console.log(`${'='.repeat(60)}\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const dryRunArg = args.includes('--dry-run');

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;

console.log('\nUsage:');
console.log('  npx tsx scripts/generate-bill-summaries.ts [options]');
console.log('\nOptions:');
console.log('  --limit=N     Process N bills (default: 10)');
console.log('  --dry-run     Test mode, no database updates');
console.log('\nExamples:');
console.log('  npx tsx scripts/generate-bill-summaries.ts --limit=5 --dry-run');
console.log('  npx tsx scripts/generate-bill-summaries.ts --limit=50');
console.log('  npx tsx scripts/generate-bill-summaries.ts --limit=967  # Process all\n');

processBills(limit, dryRunArg).catch(console.error);
