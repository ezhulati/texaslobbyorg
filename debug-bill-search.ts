import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugSearch() {
  console.log('\n🔍 Testing bill search for "HB 10"\n');

  // Test 1: Direct search_bills function
  console.log('1. Using search_bills function:');
  const { data: searchResults, error: searchError } = await supabase.rpc('search_bills', {
    search_query: 'HB 10',
    subject_filters: null,
    session_filter: null,
    chamber_filter: null,
    status_filter: null,
    limit_count: 5,
    offset_count: 0
  });

  if (searchError) {
    console.log('   ERROR:', searchError.message);
  } else {
    console.log(`   Found ${searchResults.length} results:`);
    searchResults.forEach((bill: any) => {
      console.log(`   - ${bill.bill_number}: ${bill.title?.substring(0, 50)}...`);
    });
  }

  // Test 2: Check if HB 10 exists
  console.log('\n2. Direct query for HB 10:');
  const { data: exactMatch } = await supabase
    .from('bills')
    .select('id, bill_number, title, search_vector')
    .eq('bill_number', 'HB 10')
    .single();

  if (exactMatch) {
    console.log(`   ✓ HB 10 EXISTS in database`);
    console.log(`   Title: ${exactMatch.title}`);
    console.log(`   ID: ${exactMatch.id}`);
    console.log(`   Search vector: ${exactMatch.search_vector ? 'Present' : 'Missing'}`);
  } else {
    console.log('   ✗ HB 10 NOT FOUND');
  }

  // Test 3: Try different search queries
  console.log('\n3. Testing different search patterns:');

  const queries = ['HB 10', 'HB-10', 'HB10', '10'];

  for (const query of queries) {
    const { data } = await supabase.rpc('search_bills', {
      search_query: query,
      subject_filters: null,
      session_filter: null,
      chamber_filter: null,
      status_filter: null,
      limit_count: 3,
      offset_count: 0
    });

    const containsHB10 = data?.some((b: any) => b.bill_number === 'HB 10');
    console.log(`   Query "${query}": ${data?.length || 0} results, HB 10 included: ${containsHB10 ? '✓' : '✗'}`);
    if (data && data.length > 0) {
      console.log(`      First result: ${data[0].bill_number}`);
    }
  }

  console.log('\n');
}

debugSearch().catch(console.error);
