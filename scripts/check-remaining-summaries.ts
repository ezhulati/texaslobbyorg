import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRemaining() {
  // Total bills
  const { count: total } = await supabase
    .from('bills')
    .select('*', { count: 'exact', head: true });

  // Bills with full text
  const { count: withText } = await supabase
    .from('bills')
    .select('*', { count: 'exact', head: true })
    .not('full_text', 'is', null);

  // Bills with placeholder summaries
  const { data: placeholders } = await supabase
    .from('bills')
    .select('id, bill_number, summary')
    .not('full_text', 'is', null)
    .like('summary', 'relating to%');

  const placeholderCount = placeholders?.filter(b => b.summary && b.summary.length < 100).length || 0;

  console.log('=== Bill Summary Status ===');
  console.log(`Total bills: ${total}`);
  console.log(`Bills with full text: ${withText}`);
  console.log(`Bills with placeholder summaries: ${placeholderCount}`);
  console.log(`Bills needing real summaries: ${placeholderCount}`);

  if (placeholderCount > 0) {
    console.log(`\nFirst 5 bills needing summaries:`);
    placeholders?.slice(0, 5).forEach(b => {
      console.log(`- ${b.bill_number}: "${b.summary?.substring(0, 60)}..."`);
    });
  }
}

checkRemaining();
