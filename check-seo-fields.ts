import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: sample } = await supabase
  .from('bills')
  .select('bill_number, title, title_tag, meta_description')
  .limit(3);

console.log('\n=== Current SEO Fields Sample ===\n');
sample?.forEach(b => {
  console.log(`${b.bill_number}:`);
  console.log(`  Title: ${b.title}`);
  console.log(`  Title Tag (${b.title_tag?.length || 0} chars): ${b.title_tag}`);
  console.log(`  Meta Desc (${b.meta_description?.length || 0} chars): ${b.meta_description}`);
  console.log('');
});

// Count bills needing SEO
const { count: needTitleTag } = await supabase
  .from('bills')
  .select('*', { count: 'exact', head: true })
  .or('title_tag.is.null,title_tag.eq.');

const { count: needMetaDesc } = await supabase
  .from('bills')
  .select('*', { count: 'exact', head: true })
  .or('meta_description.is.null,meta_description.eq.');

console.log(`📊 Bills needing title_tag: ${needTitleTag}`);
console.log(`📊 Bills needing meta_description: ${needMetaDesc}\n`);
