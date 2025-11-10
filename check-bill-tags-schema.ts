import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://ntyzdtqilbxmjbwylfhx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('bill_tags')
    .select('*')
    .limit(1);

  if (error && error.code !== 'PGRST116') {
    console.error('Error:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log('No existing tags, checking table structure...');
    // Try to insert a test record to see what columns are required
    const { error: insertError } = await supabase
      .from('bill_tags')
      .insert({})
      .select();
    
    if (insertError) {
      console.log('Insert error reveals columns:', insertError);
    }
  } else {
    console.log('Bill_tags columns:');
    console.log(Object.keys(data[0]).join(', '));
  }
}

checkSchema();
