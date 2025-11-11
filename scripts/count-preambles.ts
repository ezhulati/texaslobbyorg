import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function countPreambles() {
  // Fetch in batches to avoid limit
  let offset = 0;
  const batchSize = 1000;
  let total = 0;
  let withPreambles = 0;

  while (true) {
    const { data, error } = await supabase
      .from('bills')
      .select('summary')
      .not('summary', 'is', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error('Error:', error);
      break;
    }

    if (!data || data.length === 0) break;

    total += data.length;

    const preambleCount = data.filter(b =>
      /^(here'?s|summary:|this bill(?!\s+\w+s\b)|the bill(?!\s+\w+s\b))/i.test(b.summary || '')
    ).length;

    withPreambles += preambleCount;

    console.log(`Processed ${offset}-${offset + data.length}: Found ${preambleCount} with preambles`);

    if (data.length < batchSize) break;
    offset += batchSize;
  }

  console.log(`\nTotal bills with summaries: ${total}`);
  console.log(`Bills with preambles: ${withPreambles}`);
}

countPreambles();
