import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testProfile() {
  const testEmail = 'enri@albaniavisit.com';

  console.log('🔍 Looking for profile with email:', testEmail);

  // Find user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .single();

  if (userError || !user) {
    console.log('❌ User not found');
    return;
  }

  console.log('✅ User found:', user.id, user.email);

  // Find lobbyist profile
  const { data: lobbyist, error: lobbyistError } = await supabase
    .from('lobbyists')
    .select('*')
    .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`)
    .single();

  if (lobbyistError || !lobbyist) {
    console.log('❌ Lobbyist profile not found for user');
    console.log('   Error:', lobbyistError);
    console.log('\n   Checking all lobbyist profiles with user_id or claimed_by...');

    const { data: allLobbyists } = await supabase
      .from('lobbyists')
      .select('id, first_name, last_name, email, user_id, claimed_by')
      .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`);

    console.log('   Results:', allLobbyists);
    return;
  }

  console.log('✅ Lobbyist profile found:');
  console.log('   ID:', lobbyist.id);
  console.log('   Name:', lobbyist.first_name, lobbyist.last_name);
  console.log('   Email:', lobbyist.email);
  console.log('   User ID:', lobbyist.user_id);
  console.log('   Claimed by:', lobbyist.claimed_by);
  console.log('   photo_url:', (lobbyist as any).photo_url || 'None');
  console.log('   profile_image_url:', (lobbyist as any).profile_image_url || 'None');
  console.log('\n✅ Profile exists and can be updated!');
}

testProfile().catch(console.error);
