/**
 * Generate unique, bill-specific intro hooks using Anthropic Claude API
 * Replaces generic "could reshape how Texas handles" garbage with actual content
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
  intro_hook: string | null;
}

// Generic patterns that indicate a bad intro hook
const GENERIC_PATTERNS = [
  /could reshape how Texas handles/i,
  /marking a significant shift/i,
  /represents.*most closely watched/i,
  /has emerged as a key battleground/i,
  /proposes sweeping changes/i,
  /would modify how Texas/i,
  /introduced by Texas legislators/i,
];

function isGenericHook(hook: string | null): boolean {
  if (!hook) return true;
  return GENERIC_PATTERNS.some(pattern => pattern.test(hook));
}

async function generateIntroHook(
  billText: string,
  billTitle: string,
  billSummary: string | null
): Promise<string> {
  // Truncate very long bill text
  const maxChars = 40000;
  const truncatedText = billText.length > maxChars
    ? billText.substring(0, maxChars) + '\n\n[Text truncated for length]'
    : billText;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 150,
    temperature: 0.7,
    system: `You are a legislative writer who creates engaging, specific opening sentences for bill pages.

Your intro hooks must:
- Be ONE sentence long (10-25 words ideal)
- Be SPECIFIC to the actual bill content
- Create immediate interest and clarity
- NOT repeat the summary
- NOT use generic phrases like "could reshape how Texas handles" or "represents a significant shift"
- Start with what the bill actually DOES (e.g., "Requires school districts to...", "Prohibits state agencies from...", "Establishes a new...", "Allows homeowners to...")

Write ONLY the intro sentence. No preamble.`,
    messages: [{
      role: 'user',
      content: `Create a specific, engaging one-sentence intro hook for this Texas bill.

Bill Title: ${billTitle}

${billSummary ? `Summary: ${billSummary}\n` : ''}
Bill Text:
${truncatedText}

Write ONE specific sentence (10-25 words) that hooks the reader by clearly stating what this bill actually does. Do NOT use generic language.`
    }]
  });

  const hook = response.content[0].type === 'text'
    ? response.content[0].text.trim()
    : '';

  // Remove any quotes that might wrap the sentence
  return hook.replace(/^["']|["']$/g, '');
}

async function processBills(limit: number = 10, dryRun: boolean = false) {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Bill Intro Hook Generation Script');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no database updates)' : 'LIVE (will update database)'}`);
  console.log(`Batch size: ${limit} bills`);
  console.log(`${'='.repeat(70)}\n`);

  // Get bills with generic or missing intro hooks
  const { data: allBills, error } = await supabase
    .from('bills')
    .select('id, bill_number, title, summary, full_text, intro_hook')
    .not('full_text', 'is', null)
    .order('bill_number');

  if (error) {
    console.error('Error fetching bills:', error);
    return;
  }

  // Filter for bills that need new intro hooks
  const bills = (allBills || [])
    .filter((b: Bill) => {
      // Need intro hook if: null, empty, or generic
      return !b.intro_hook || b.intro_hook.trim() === '' || isGenericHook(b.intro_hook);
    })
    .slice(0, limit);

  if (!bills || bills.length === 0) {
    console.log('No bills need intro hooks!');
    return;
  }

  console.log(`Found ${bills.length} bills to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i] as Bill;

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`[${i + 1}/${bills.length}] ${bill.bill_number}`);
    console.log(`Title: ${bill.title}`);

    if (bill.intro_hook) {
      console.log(`\n❌ Current (generic): "${bill.intro_hook}"`);
    } else {
      console.log(`\n❌ Current: (none)`);
    }

    if (!bill.full_text) {
      console.log('⚠️  No full text available, skipping');
      errorCount++;
      continue;
    }

    try {
      const newHook = await generateIntroHook(
        bill.full_text,
        bill.title,
        bill.summary
      );

      console.log(`\n✨ New intro hook:`);
      console.log(`"${newHook}"`);
      console.log(`Length: ${newHook.length} characters`);

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('bills')
          .update({ intro_hook: newHook })
          .eq('id', bill.id);

        if (updateError) {
          console.log(`❌ Failed to update: ${updateError.message}`);
          errorCount++;
        } else {
          console.log('✅ Database updated');
          successCount++;
        }
      } else {
        console.log('🔍 DRY RUN - would update database');
        successCount++;
      }

      // Rate limiting: 1 second between requests
      if (i < bills.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.log(`❌ Error: ${error}`);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Generation Complete');
  console.log(`${'='.repeat(70)}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📊 Total processed: ${bills.length}`);

  // Count remaining bills needing hooks
  const { data: allRemaining } = await supabase
    .from('bills')
    .select('intro_hook')
    .not('full_text', 'is', null);

  const remainingCount = (allRemaining || []).filter(b =>
    !b.intro_hook || isGenericHook(b.intro_hook)
  ).length;

  console.log(`📝 Remaining bills needing hooks: ${remainingCount}`);
  console.log(`${'='.repeat(70)}\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const dryRunArg = args.includes('--dry-run');

const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10;

console.log('\n📖 Usage:');
console.log('  npx tsx scripts/generate-bill-intro-hooks.ts [options]');
console.log('\n⚙️  Options:');
console.log('  --limit=N     Process N bills (default: 10)');
console.log('  --dry-run     Test mode, no database updates');
console.log('\n💡 Examples:');
console.log('  npx tsx scripts/generate-bill-intro-hooks.ts --limit=5 --dry-run');
console.log('  npx tsx scripts/generate-bill-intro-hooks.ts --limit=50');
console.log('  npx tsx scripts/generate-bill-intro-hooks.ts --limit=1000  # Process all\n');

processBills(limit, dryRunArg).catch(console.error);
