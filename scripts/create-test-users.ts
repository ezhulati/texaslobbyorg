import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '../.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestUsers() {
  console.log('Creating test users...\n');

  // Test Lobbyist User
  const lobbyistEmail = 'test-lobbyist@texaslobby.org';
  const lobbyistPassword = 'password123';

  console.log(`1. Creating lobbyist user: ${lobbyistEmail}`);

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: lobbyistEmail,
    password: lobbyistPassword,
    email_confirm: true,
    user_metadata: {
      first_name: 'Test',
      last_name: 'Lobbyist',
      user_type: 'lobbyist',
    },
  });

  if (authError) {
    console.error('Error creating lobbyist auth user:', authError.message);

    // Try to get existing user
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const existing = existingUser?.users.find(u => u.email === lobbyistEmail);

    if (existing) {
      console.log('User already exists, updating password...');
      await supabase.auth.admin.updateUserById(existing.id, {
        password: lobbyistPassword,
      });
      console.log('✓ Password updated');

      // Use existing user
      await createLobbyistProfile(existing.id, lobbyistEmail);
    }
  } else if (authData.user) {
    console.log('✓ Auth user created');
    await createLobbyistProfile(authData.user.id, lobbyistEmail);
  }

  console.log('\n✅ Test users ready!');
  console.log('\nLogin credentials:');
  console.log(`  Email: ${lobbyistEmail}`);
  console.log(`  Password: ${lobbyistPassword}`);
}

async function createLobbyistProfile(userId: string, email: string) {
  // Create user record
  const { error: userError } = await supabase.from('users').upsert({
    id: userId,
    email,
    role: 'lobbyist',
    full_name: 'Test Lobbyist',
  });

  if (userError) {
    console.error('Error creating user record:', userError.message);
  } else {
    console.log('✓ User record created');
  }

  // Create lobbyist profile
  const { error: lobbyistError } = await supabase.from('lobbyists').upsert({
    user_id: userId,
    first_name: 'Test',
    last_name: 'Lobbyist',
    email,
    slug: 'test-lobbyist',
    bio: 'This is a test lobbyist account for development and testing purposes.',
    years_experience: 10,
    is_active: true,
    subscription_tier: 'free',
    cities: ['Austin'],
    subject_areas: ['Healthcare', 'Technology'],
  });

  if (lobbyistError) {
    console.error('Error creating lobbyist profile:', lobbyistError.message);
  } else {
    console.log('✓ Lobbyist profile created');
  }
}

// Run the script
createTestUsers().catch(console.error);
