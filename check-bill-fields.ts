import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: bill } = await supabase
  .from('bills')
  .select('*, legislative_sessions(*)')
  .eq('bill_number', 'HB 1005')
  .single();

console.log('\n=== Sample Bill Data (HB 1005) ===\n');
console.log(JSON.stringify(bill, null, 2));
