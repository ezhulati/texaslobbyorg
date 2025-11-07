import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixLobbyistRole() {
  const lobbyistEmail = 'test-lobbyist@texaslobby.org';

  console.log('Fixing role for:', lobbyistEmail);

  // Update the role to lobbyist
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'lobbyist' })
    .eq('email', lobbyistEmail)
    .select();

  if (error) {
    console.error('Error updating role:', error);
  } else {
    console.log('✓ Role updated successfully:', data);
  }
}

fixLobbyistRole().catch(console.error);
