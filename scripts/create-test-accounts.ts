import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestAccounts() {
  const password = 'TestPassword123!';

  // Create searcher account
  console.log('\n=== Creating Searcher Account ===');
  const searcherEmail = 'test-searcher@texaslobby.org';

  const { data: searcherAuth, error: searcherAuthError } = await supabase.auth.admin.createUser({
    email: searcherEmail,
    password: password,
    email_confirm: true,
    user_metadata: {
      first_name: 'Test',
      last_name: 'Searcher',
    }
  });

  if (searcherAuthError) {
    console.error('Searcher auth error:', searcherAuthError);
  } else {
    console.log('✓ Searcher auth account created:', searcherEmail);

    // Create user record
    const { error: searcherUserError } = await supabase.from('users').upsert({
      id: searcherAuth.user.id,
      email: searcherEmail,
      role: 'searcher',
      full_name: 'Test Searcher',
    });

    if (searcherUserError) {
      console.error('Searcher user record error:', searcherUserError);
    } else {
      console.log('✓ Searcher user record created');
    }
  }

  // Create lobbyist account
  console.log('\n=== Creating Lobbyist Account ===');
  const lobbyistEmail = 'test-lobbyist@texaslobby.org';

  const { data: lobbyistAuth, error: lobbyistAuthError } = await supabase.auth.admin.createUser({
    email: lobbyistEmail,
    password: password,
    email_confirm: true,
    user_metadata: {
      first_name: 'Test',
      last_name: 'Lobbyist',
    }
  });

  if (lobbyistAuthError) {
    console.error('Lobbyist auth error:', lobbyistAuthError);
  } else {
    console.log('✓ Lobbyist auth account created:', lobbyistEmail);

    // Create user record
    const { error: lobbyistUserError } = await supabase.from('users').upsert({
      id: lobbyistAuth.user.id,
      email: lobbyistEmail,
      role: 'lobbyist',
      full_name: 'Test Lobbyist',
    });

    if (lobbyistUserError) {
      console.error('Lobbyist user record error:', lobbyistUserError);
    } else {
      console.log('✓ Lobbyist user record created');
    }
  }

  console.log('\n=== Test Account Credentials ===');
  console.log('Searcher Account:');
  console.log('  Email:', searcherEmail);
  console.log('  Password:', password);
  console.log('\nLobbyist Account:');
  console.log('  Email:', lobbyistEmail);
  console.log('  Password:', password);
  console.log('\nLogin at: https://texaslobby.org/login');
}

createTestAccounts().catch(console.error);
