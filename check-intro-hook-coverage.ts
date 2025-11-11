import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

console.log('\n=== Intro Hook Coverage Analysis ===\n');

// Total bills
const { count: totalBills } = await supabase
  .from('bills')
  .select('*', { count: 'exact', head: true });

console.log(`📊 Total bills in database: ${totalBills?.toLocaleString()}`);

// Bills with intro hooks
const { count: withHooks } = await supabase
  .from('bills')
  .select('*', { count: 'exact', head: true })
  .not('intro_hook', 'is', null);

console.log(`✅ Bills with intro hooks: ${withHooks?.toLocaleString()}`);

// Bills without intro hooks
const { count: withoutHooks } = await supabase
  .from('bills')
  .select('*', { count: 'exact', head: true })
  .is('intro_hook', null);

console.log(`❌ Bills without intro hooks: ${withoutHooks?.toLocaleString()}`);

// Bills with full_text but no intro hook
const { count: hasTextNoHook } = await supabase
  .from('bills')
  .select('*', { count: 'exact', head: true })
  .not('full_text', 'is', null)
  .is('intro_hook', null);

console.log(`📝 Bills with full_text but no intro hook: ${hasTextNoHook?.toLocaleString()}`);

// Bills without full_text
const { count: noText } = await supabase
  .from('bills')
  .select('*', { count: 'exact', head: true })
  .is('full_text', null);

console.log(`⚠️  Bills without full_text: ${noText?.toLocaleString()}`);

// Coverage percentage
const coverage = totalBills ? ((withHooks || 0) / totalBills * 100).toFixed(1) : 0;
console.log(`\n📈 Coverage: ${coverage}% of all bills have intro hooks`);

// Sample bills without intro hooks
const { data: samplesNoHook } = await supabase
  .from('bills')
  .select('bill_number, title, full_text')
  .is('intro_hook', null)
  .limit(5);

console.log('\n📋 Sample bills without intro hooks:');
samplesNoHook?.forEach(b => {
  console.log(`  - ${b.bill_number}: ${b.title.substring(0, 60)}...`);
  console.log(`    Has full_text: ${!!b.full_text}`);
});

console.log('\n');
