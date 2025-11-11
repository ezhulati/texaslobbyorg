import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkTestLobbyist() {
  // Find the user
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'test-lobbyist@texaslobby.org');

  console.log('User account:', users);

  if (users && users.length > 0) {
    const userId = users[0].id;

    // Check for lobbyist profile
    const { data: lobbyists } = await supabase
      .from('lobbyists')
      .select('*')
      .or(`user_id.eq.${userId},email.eq.test-lobbyist@texaslobby.org`);

    console.log('\nLobbyist profiles:', lobbyists);
    console.log(`Found ${lobbyists?.length || 0} lobbyist profiles`);
  }
}

checkTestLobbyist();
