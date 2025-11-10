import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const userId = '95340197-a8df-4827-969e-8f1d5a957415';

async function updateName() {
  console.log('🔍 Checking current lobbyist name...\n');

  // Check current name
  const { data: current, error: fetchError } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, user_id, claimed_by')
    .or(`user_id.eq.${userId},claimed_by.eq.${userId}`);

  if (fetchError) {
    console.error('❌ Error fetching lobbyist:', fetchError);
    return;
  }

  console.log('Current lobbyist records:', current);

  if (!current || current.length === 0) {
    console.error('❌ No lobbyist record found for user');
    return;
  }

  console.log('\n📝 Updating to "EZ" "Lobby"...\n');

  // Update name
  const { data: updated, error: updateError } = await supabase
    .from('lobbyists')
    .update({
      first_name: 'EZ',
      last_name: 'Lobby',
    })
    .or(`user_id.eq.${userId},claimed_by.eq.${userId}`)
    .select();

  if (updateError) {
    console.error('❌ Error updating:', updateError);
    return;
  }

  console.log('✅ Updated lobbyist records:', updated);

  // Also update users table
  const { error: userUpdateError } = await supabase
    .from('users')
    .update({
      first_name: 'EZ',
      last_name: 'Lobby',
      full_name: 'EZ Lobby',
    })
    .eq('id', userId);

  if (userUpdateError) {
    console.error('❌ Error updating user:', userUpdateError);
  } else {
    console.log('✅ Updated user record');
  }

  console.log('\n🎉 Name update complete!');
  console.log('Refresh your browser to see changes.');
}

updateName();
