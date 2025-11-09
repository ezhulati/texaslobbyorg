import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSubscription() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, subscription_tier, subscription_status, stripe_subscription_id, stripe_customer_id')
    .eq('email', 'enri@albaniavisit.com')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Current database state:');
  console.log(JSON.stringify(data, null, 2));
  
  // Also check lobbyist tier
  const { data: lobbyist } = await supabase
    .from('lobbyists')
    .select('subscription_tier')
    .eq('user_id', data.id)
    .single();
    
  console.log('\nLobbyist tier:', lobbyist?.subscription_tier);
}

checkSubscription();
