import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key (first 20 chars):', supabaseKey?.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

// Test a simple query
try {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name')
    .limit(1);

  if (error) {
    console.error('\n❌ Supabase Error:', error.message);
    console.error('Hint:', error.hint);
    process.exit(1);
  }

  console.log('\n✅ Supabase connection successful!');
  console.log('Test query result:', data);
  process.exit(0);
} catch (err) {
  console.error('\n❌ Connection failed:', err.message);
  process.exit(1);
}
