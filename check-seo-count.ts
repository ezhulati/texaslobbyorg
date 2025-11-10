import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSEOCount() {
  // Count bills WITH SEO
  const { count: withSEO } = await supabase
    .from('bills')
    .select('id', { count: 'exact', head: true })
    .not('title_tag', 'is', null);

  // Count bills WITHOUT SEO but have titles
  const { count: needingSEO } = await supabase
    .from('bills')
    .select('id', { count: 'exact', head: true })
    .is('title_tag', null)
    .not('title', 'is', null);

  // Get a sample bill with SEO
  const { data: sample } = await supabase
    .from('bills')
    .select('bill_number, title_tag, meta_description, intro_hook, excerpt')
    .not('title_tag', 'is', null)
    .limit(1)
    .single();

  console.log('\n📊 SEO Metadata Status:');
  console.log(`   ✅ Bills WITH SEO: ${withSEO}`);
  console.log(`   ⏳ Bills still needing SEO: ${needingSEO}`);
  console.log(`   📈 Completion: ${((withSEO / (withSEO + needingSEO)) * 100).toFixed(1)}%`);

  if (sample) {
    console.log(`\n📝 Sample Bill (${sample.bill_number}):`);
    console.log(`   Title Tag (${sample.title_tag.length} chars): ${sample.title_tag}`);
    console.log(`   Meta Desc (${sample.meta_description.length} chars): ${sample.meta_description}`);
    console.log(`   Intro Hook: ${sample.intro_hook}`);
    console.log(`   Excerpt: ${sample.excerpt}`);
  }
}

checkSEOCount().catch(console.error);
