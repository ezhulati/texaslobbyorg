import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncToPremium() {
  try {
    const userId = '95340197-a8df-4827-969e-8f1d5a957415';

    console.log('Syncing database to match Stripe (Premium)...\n');

    // Update user to Premium
    const { error: userError } = await supabase
      .from('users')
      .update({
        subscription_tier: 'premium',
      })
      .eq('id', userId);

    if (userError) throw userError;
    console.log('✅ User updated to Premium tier');

    // Update lobbyist profile to Premium
    const { error: lobbyistError } = await supabase
      .from('lobbyists')
      .update({
        subscription_tier: 'premium',
      })
      .eq('user_id', userId);

    if (lobbyistError) throw lobbyistError;
    console.log('✅ Lobbyist profile updated to Premium tier');

    console.log('\n🎉 Database now matches Stripe (Premium $297/month)');
    console.log('💡 Future upgrades/downgrades will sync automatically via webhook');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

syncToPremium();
