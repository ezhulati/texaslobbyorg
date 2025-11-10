import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://tavwfbqflredtowjelbx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('watchlist_entries')
    .select('*')
    .limit(1);

  if (error && error.code !== 'PGRST116') {
    console.error('Error:', error);
  }

  if (!data || data.length === 0) {
    console.log('No watchlist entries yet');
  } else {
    console.log('Watchlist_entries columns:');
    console.log(Object.keys(data[0]).join(', '));
  }
}

checkSchema();
