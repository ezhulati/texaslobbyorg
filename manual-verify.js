// Manually verify email for user
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tavwfbqflredtowjelbx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMxNzYwNSwiZXhwIjoyMDc3ODkzNjA1fQ.Fxxb6Qt6K9WAHXik86PcaNSmiagYQicAv8ONtx6Np3Q';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const email = 'enri@albaniavisit.com';

async function manualVerify() {
  console.log(`Manually verifying email for: ${email}`);

  // Get user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.error(`User not found: ${email}`);
    return;
  }

  console.log(`Found user ID: ${user.id}`);
  console.log(`Current email_confirmed_at: ${user.email_confirmed_at}`);

  // Manually update the user's email_confirmed_at field
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  );

  if (error) {
    console.error('Error verifying email:', error);
    return;
  }

  console.log('✅ Email manually verified!');
  console.log('User can now log in at: https://texaslobby.org/login');
  console.log('\nUser details:', data.user);
}

manualVerify();
