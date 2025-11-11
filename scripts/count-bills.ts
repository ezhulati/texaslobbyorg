import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function countBills() {
  const { count, error } = await supabase
    .from('bills')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Total bills in database: ${count}`);
  }
}

countBills();
