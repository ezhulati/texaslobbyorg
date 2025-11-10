import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPhotoField() {
  const testEmail = 'enri@albaniavisit.com';

  console.log('🔍 Finding user and profile...');

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

  console.log('✅ User found:', user.id);

  // Find lobbyist profile
  const { data: lobbyist, error: lobbyistError } = await supabase
    .from('lobbyists')
    .select('*')
    .or(`user_id.eq.${user.id},claimed_by.eq.${user.id}`)
    .single();

  if (lobbyistError || !lobbyist) {
    console.log('❌ Lobbyist profile not found');
    return;
  }

  console.log('✅ Lobbyist profile found:', lobbyist.id);
  console.log('   Current photo_url:', (lobbyist as any).photo_url || 'None');
  console.log('   Current profile_image_url:', (lobbyist as any).profile_image_url || 'None');

  // Copy photo_url to profile_image_url
  const photoUrl = (lobbyist as any).photo_url;

  if (!photoUrl) {
    console.log('❌ No photo_url to copy');
    return;
  }

  console.log('\n🔄 Copying photo_url to profile_image_url...');

  const { data: updateData, error: updateError } = await supabase
    .from('lobbyists')
    .update({ profile_image_url: photoUrl })
    .eq('id', lobbyist.id)
    .select();

  if (updateError) {
    console.error('❌ Update failed:', updateError);
    return;
  }

  console.log('✅ Successfully updated profile_image_url!');
  console.log('   New profile_image_url:', updateData[0].profile_image_url);
}

fixPhotoField().catch(console.error);
