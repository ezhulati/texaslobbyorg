import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: bills } = await supabase
  .from('bills')
  .select('bill_number, title, intro_hook')
  .not('intro_hook', 'is', null)
  .limit(15)
  .order('bill_number');

console.log('\nSample intro hooks:\n');
bills?.forEach(b => {
  console.log(`${b.bill_number}: ${b.intro_hook}`);
  console.log('');
});

// Count bills with generic patterns
const { data: allBills } = await supabase
  .from('bills')
  .select('bill_number, intro_hook')
  .not('intro_hook', 'is', null);

const genericPatterns = [
  /could reshape how Texas handles/i,
  /marking a significant shift/i,
  /represents a major change/i,
  /would modify how Texas/i,
];

const genericCount = allBills?.filter(b =>
  genericPatterns.some(pattern => b.intro_hook?.match(pattern))
).length || 0;

console.log(`\nTotal bills with intro hooks: ${allBills?.length || 0}`);
console.log(`Bills with generic patterns: ${genericCount}`);
