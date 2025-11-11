import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkPreambles() {
  const { data } = await supabase
    .from('bills')
    .select('bill_number, summary')
    .in('bill_number', ['HB 1907', 'HB 1917', 'HB 1932', 'HB 1937', 'HB 1938', 'HB 194', 'HB 1945', 'HB 1959'])
    .order('bill_number');

  console.log('Checking recently generated summaries for preambles:\n');
  data?.forEach(b => {
    const hasPreamble = /^(here'?s|summary:|this bill|the bill)/i.test(b.summary || '');
    console.log(`${b.bill_number}: ${hasPreamble ? '❌ HAS PREAMBLE' : '✅ Clean'}`);
    if (hasPreamble) {
      console.log(`  "${b.summary?.substring(0, 80)}..."\n`);
    }
  });
}

checkPreambles();
