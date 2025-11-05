import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateTiers() {
  console.log('Updating subscription tiers...\n');

  // Update Sean Abbott to featured
  console.log('1. Updating Sean Abbott to featured tier...');
  const { data: seanData, error: seanError } = await supabase
    .from('lobbyists')
    .update({ subscription_tier: 'featured' })
    .eq('slug', 'sean-abbott')
    .select('id, first_name, last_name, slug, subscription_tier');

  if (seanError) {
    console.error('❌ Error updating Sean Abbott:', seanError.message);
  } else if (seanData && seanData.length > 0) {
    console.log('✅ Sean Abbott updated to featured tier');
    console.log('   Details:', seanData[0]);
  } else {
    console.log('⚠️  Sean Abbott not found');
  }

  console.log('');

  // Update Thomas Anderson to premium
  console.log('2. Updating Thomas Anderson to premium tier...');
  const { data: thomasData, error: thomasError } = await supabase
    .from('lobbyists')
    .update({ subscription_tier: 'premium' })
    .eq('slug', 'thomas-anderson')
    .select('id, first_name, last_name, slug, subscription_tier');

  if (thomasError) {
    console.error('❌ Error updating Thomas Anderson:', thomasError.message);
  } else if (thomasData && thomasData.length > 0) {
    console.log('✅ Thomas Anderson updated to premium tier');
    console.log('   Details:', thomasData[0]);
  } else {
    console.log('⚠️  Thomas Anderson not found');
  }

  console.log('\n✅ All updates complete!');
}

updateTiers();
