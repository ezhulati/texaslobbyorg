/**
 * Generate summaries for bills with placeholder "relating to" text
 * Uses direct SQL LIKE query to find them
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anthropicKey = process.env.ANTHROPIC_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const anthropic = new Anthropic({ apiKey: anthropicKey });

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
  const maxChars = 50000;
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

async function processRemaining(limit: number = 1000) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Generating Summaries for Remaining Bills');
  console.log(`Limit: ${limit} bills`);
  console.log(`${'='.repeat(60)}\n`);

  // Use SQL LIKE to find bills with "relating to" summaries
  const { data: bills, error } = await supabase
    .from('bills')
    .select('id, bill_number, title, summary, full_text')
    .not('full_text', 'is', null)
    .like('summary', 'relating to%')
    .order('bill_number')
    .limit(limit);

  if (error) {
    console.error('Error fetching bills:', error);
    return;
  }

  if (!bills || bills.length === 0) {
    console.log('No bills found!');
    return;
  }

  console.log(`Found ${bills.length} bills to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < bills.length; i++) {
    const bill = bills[i];

    console.log(`\n[${i + 1}/${bills.length}] Processing ${bill.bill_number}...`);

    if (!bill.full_text) {
      console.log('❌ No full text available');
      errorCount++;
      continue;
    }

    try {
      const newSummary = await generateSummary(bill.full_text, bill.title);

      console.log(`✨ Generated: "${newSummary.substring(0, 100)}..."`);

      const { error: updateError } = await supabase
        .from('bills')
        .update({ summary: newSummary })
        .eq('id', bill.id);

      if (updateError) {
        console.log(`❌ Failed to update: ${updateError.message}`);
        errorCount++;
      } else {
        console.log('✅ Database updated');
        successCount++;
      }

      // Rate limiting
      if (i < bills.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.log(`❌ Error: ${error}`);
      errorCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Complete!');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`${'='.repeat(60)}\n`);
}

const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 1000;

processRemaining(limit).catch(console.error);
