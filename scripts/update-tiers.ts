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
  // Get first 10 lobbyists
  const { data: lobbyists, error } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, slug')
    .order('id')
    .limit(10);

  if (error) {
    console.error('Error fetching lobbyists:', error);
    return;
  }

  console.log('Current lobbyists:', lobbyists);

  // Update first 3 to premium
  if (lobbyists && lobbyists.length >= 3) {
    for (let i = 0; i < 3; i++) {
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({ subscription_tier: 'premium' })
        .eq('id', lobbyists[i].id);

      if (updateError) {
        console.error(`Error updating ${lobbyists[i].first_name}:`, updateError);
      } else {
        console.log(`✓ Updated ${lobbyists[i].first_name} ${lobbyists[i].last_name} to premium`);
      }
    }

    // Update 4th to featured
    if (lobbyists.length >= 4) {
      const { error: updateError } = await supabase
        .from('lobbyists')
        .update({ subscription_tier: 'featured' })
        .eq('id', lobbyists[3].id);

      if (updateError) {
        console.error(`Error updating ${lobbyists[3].first_name}:`, updateError);
      } else {
        console.log(`✓ Updated ${lobbyists[3].first_name} ${lobbyists[3].last_name} to featured`);
      }
    }
  }
}

updateTiers();
