import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkRobertMiller() {
  const { data: lobbyist } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, slug, is_claimed, user_id, email')
    .eq('slug', 'robert-d-miller')
    .single();

  console.log('Robert D. Miller profile:');
  console.log(JSON.stringify(lobbyist, null, 2));
}

checkRobertMiller();
