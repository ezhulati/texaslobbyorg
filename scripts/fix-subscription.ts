import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSubscription() {
  // Get the user who just subscribed (most recent user or by email)
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/fix-subscription.ts <user-email>');
    process.exit(1);
  }

  console.log(`Fixing subscription for ${email}...`);

  // Update user to premium
  const { data: user, error: updateError } = await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_status: 'active',
      subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
    })
    .eq('email', email)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating user:', updateError);
    process.exit(1);
  }

  console.log('User updated successfully:', user);

  // Update lobbyist profile if exists
  const { data: lobbyist, error: lobbyistError } = await supabase
    .from('lobbyists')
    .update({
      subscription_tier: 'premium',
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (lobbyistError) {
    console.log('No lobbyist profile found or error updating:', lobbyistError.message);
  } else {
    console.log('Lobbyist profile updated successfully:', lobbyist);
  }

  console.log('\n✅ Subscription fixed! User is now on Premium tier.');
}

fixSubscription();
