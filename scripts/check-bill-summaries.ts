/**
 * Check the status of bill summaries in the database
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSummaries() {
  // Get summary statistics
  const { data: bills, error } = await supabase
    .from('bills')
    .select('id, bill_number, summary, full_text')
    .order('bill_number');

  if (error) {
    console.error('Error fetching bills:', error);
    return;
  }

  const totalBills = bills.length;
  const noSummary = bills.filter(b => !b.summary || b.summary.trim() === '').length;
  const placeholderSummary = bills.filter(b =>
    b.summary &&
    b.summary.startsWith('relating to') &&
    b.summary.length < 100
  ).length;
  const hasFullText = bills.filter(b => b.full_text && b.full_text.trim() !== '').length;
  const needsSummary = bills.filter(b =>
    !b.summary ||
    b.summary.trim() === '' ||
    (b.summary.startsWith('relating to') && b.summary.length < 100)
  );

  console.log('=== Bill Summary Statistics ===');
  console.log(`Total bills: ${totalBills}`);
  console.log(`No summary: ${noSummary}`);
  console.log(`Placeholder summary: ${placeholderSummary}`);
  console.log(`Has full text: ${hasFullText}`);
  console.log(`Needs real summary: ${needsSummary.length}`);
  console.log('\nFirst 10 bills needing summaries:');
  needsSummary.slice(0, 10).forEach(b => {
    console.log(`- ${b.bill_number}: "${b.summary?.substring(0, 80)}..."`);
    console.log(`  Has full text: ${b.full_text ? 'Yes' : 'No'}`);
  });
}

checkSummaries().catch(console.error);
