import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getSampleBills() {
  // Get 5 random bills with SEO metadata
  const { data: bills } = await supabase
    .from('bills')
    .select('bill_number, slug, title, title_tag, meta_description, intro_hook, excerpt')
    .not('title_tag', 'is', null)
    .limit(5);

  if (!bills || bills.length === 0) {
    console.log('No bills with SEO found yet');
    return;
  }

  console.log('\n🎯 Sample Bills with SEO Metadata:\n');

  bills.forEach((bill, index) => {
    console.log(`${index + 1}. ${bill.bill_number} - ${bill.title?.substring(0, 60)}...`);
    console.log(`   URL: http://localhost:4322/bills/${bill.slug}`);
    console.log(`   Title Tag: ${bill.title_tag}`);
    console.log(`   Meta Desc: ${bill.meta_description?.substring(0, 100)}...`);
    console.log('');
  });

  console.log('\n💡 Copy one of the URLs above to view in your browser!');
}

getSampleBills().catch(console.error);
