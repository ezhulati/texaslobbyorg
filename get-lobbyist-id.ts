import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getLobbyistId() {
  const { data, error } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, slug')
    .eq('subscription_tier', 'premium')
    .limit(1)
    .single();

  if (error) {
    console.log('No premium lobbyist found, trying featured...');
    const { data: featured, error: featuredError } = await supabase
      .from('lobbyists')
      .select('id, first_name, last_name, slug')
      .eq('subscription_tier', 'featured')
      .limit(1)
      .single();

    if (featuredError) {
      console.log('No featured lobbyist found, getting any lobbyist...');
      const { data: any, error: anyError } = await supabase
        .from('lobbyists')
        .select('id, first_name, last_name, slug')
        .limit(1)
        .single();

      if (anyError) {
        console.error('Error:', anyError);
        return;
      }
      console.log(JSON.stringify(any, null, 2));
      return;
    }
    console.log(JSON.stringify(featured, null, 2));
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

getLobbyistId();
