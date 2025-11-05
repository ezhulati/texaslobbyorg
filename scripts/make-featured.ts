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

async function makeFeatured() {
  // Find Thomas Anderson
  const { data: thomas } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, slug')
    .ilike('first_name', '%thomas%')
    .ilike('last_name', '%anderson%')
    .single();

  if (thomas) {
    const { error } = await supabase
      .from('lobbyists')
      .update({ subscription_tier: 'featured' })
      .eq('id', thomas.id);

    if (error) {
      console.error(`Error updating ${thomas.first_name}:`, error);
    } else {
      console.log(`✓ Updated ${thomas.first_name} ${thomas.last_name} to featured`);
    }
  } else {
    console.log('Thomas Anderson not found');
  }

  // Dana S. Chiodo is already in database, update to featured
  const { error: danaError } = await supabase
    .from('lobbyists')
    .update({ subscription_tier: 'featured' })
    .eq('slug', 'dana-s-chiodo');

  if (danaError) {
    console.error('Error updating Dana:', danaError);
  } else {
    console.log('✓ Updated Dana S. Chiodo to featured');
  }
}

makeFeatured();
