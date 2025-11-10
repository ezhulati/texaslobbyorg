#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking bill tracker database tables...\n');

  const tables = [
    'legislative_sessions',
    'bills',
    'bill_updates',
    'watchlist_entries',
    'bill_tags',
    'notifications'
  ];

  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table}: DOES NOT EXIST`);
    } else {
      console.log(`✅ ${table}: ${count} records`);
    }
  }
}

checkTables();
