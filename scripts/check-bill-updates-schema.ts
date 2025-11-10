#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Fetching bill_updates schema...\n');

  // Get one record to see all columns
  const { data, error } = await supabase
    .from('bill_updates')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
  } else if (data && data.length > 0) {
    console.log('Columns in bill_updates:');
    console.log(Object.keys(data[0]).join(', '));
    console.log('\nSample record:');
    console.log(JSON.stringify(data[0], null, 2));
  }
}

checkSchema();
