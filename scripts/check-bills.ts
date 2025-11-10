import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkBills() {
  // Count total bills
  const { count: totalCount, error: countError } = await supabase
    .from('bills')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting bills:', countError);
    process.exit(1);
  }

  console.log('📊 Database Status:');
  console.log(`   Total bills: ${totalCount}`);

  // Get sample bills
  const { data: sampleBills, error: sampleError } = await supabase
    .from('bills')
    .select('bill_number, title, chamber, current_status')
    .order('created_at', { ascending: false })
    .limit(5);

  if (sampleError) {
    console.error('❌ Error fetching sample bills:', sampleError);
    process.exit(1);
  }

  console.log(`\n📋 Sample Bills:`);
  sampleBills?.forEach((bill, i) => {
    console.log(`   ${i + 1}. ${bill.bill_number} (${bill.chamber}): ${bill.title.substring(0, 60)}...`);
    console.log(`      Status: ${bill.current_status}`);
  });

  // Check session
  const { data: sessions } = await supabase
    .from('legislative_sessions')
    .select('session_code, is_current')
    .eq('is_current', true)
    .single();

  console.log(`\n🏛️  Current Session: ${sessions?.session_code || 'Unknown'}`);

  console.log('\n✅ Bill tracker database is operational!');
}

checkBills();
