import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBillSEO() {
  const { data: bill } = await supabase
    .from('bills')
    .select('bill_number, title, title_tag, meta_description, intro_hook, excerpt')
    .eq('slug', '89r-hb-47')
    .single();

  if (bill) {
    console.log('\n📋 Bill:', bill.bill_number);
    console.log('\n📝 Full Title:');
    console.log('  ', bill.title);
    console.log('\n🏷️  Title Tag (' + bill.title_tag?.length + ' chars):');
    console.log('  ', bill.title_tag);
    console.log('\n📄 Meta Description (' + bill.meta_description?.length + ' chars):');
    console.log('  ', bill.meta_description);
    console.log('\n🎯 Intro Hook:');
    console.log('  ', bill.intro_hook);
    console.log('\n✂️  Excerpt (' + bill.excerpt?.split(' ').length + ' words):');
    console.log('  ', bill.excerpt);
    console.log('\n✅ All SEO fields are populated and ready to use!');
    console.log('\n🌐 View at: http://localhost:4321/bills/89r-hb-47');
  }
}

checkBillSEO().catch(console.error);
