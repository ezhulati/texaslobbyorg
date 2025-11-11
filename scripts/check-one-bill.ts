import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBill() {
  const { data } = await supabase
    .from('bills')
    .select('bill_number, summary, full_text')
    .eq('bill_number', 'HB 3942')
    .single();

  if (data) {
    console.log('Bill:', data.bill_number);
    console.log('Summary length:', data.summary?.length || 0);
    console.log('Summary:', data.summary);
    console.log('Has full text:', !!data.full_text);
    console.log('Full text length:', data.full_text?.length || 0);
  }
}

checkBill();
