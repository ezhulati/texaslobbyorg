import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://ntyzdtqilbxmjbwylfhx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase
    .from('lobbyists')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log('Lobbyist columns:');
  console.log(Object.keys(data).join(', '));
}

checkSchema();
