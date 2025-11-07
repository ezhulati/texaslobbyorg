import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkAccounts() {
  const emails = [
    'test-searcher@texaslobby.org',
    'test-lobbyist@texaslobby.org'
  ];

  for (const email of emails) {
    console.log(`\n=== Checking ${email} ===`);

    // Check users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      console.error('User error:', userError);
    } else {
      console.log('Users table:', {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      });
    }

    // Check if lobbyist profile exists
    if (user) {
      const { data: lobbyist, error: lobbyistError } = await supabase
        .from('lobbyists')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (lobbyistError && lobbyistError.code !== 'PGRST116') {
        console.error('Lobbyist error:', lobbyistError);
      } else if (lobbyist) {
        console.log('Lobbyist profile:', {
          id: lobbyist.id,
          first_name: lobbyist.first_name,
          last_name: lobbyist.last_name,
          onboarding_step: lobbyist.onboarding_step
        });
      } else {
        console.log('No lobbyist profile found');
      }
    }
  }
}

checkAccounts().catch(console.error);
