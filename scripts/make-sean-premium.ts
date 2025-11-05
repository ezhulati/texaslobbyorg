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

async function makePremium() {
  const { error } = await supabase
    .from('lobbyists')
    .update({ subscription_tier: 'premium' })
    .eq('slug', 'sean-abbott');

  if (error) {
    console.error('Error updating Sean Abbott:', error);
  } else {
    console.log('✓ Updated Sean Abbott to premium');
  }
}

makePremium();
