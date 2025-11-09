// Resend confirmation email for a specific user
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://tavwfbqflredtowjelbx.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMxNzYwNSwiZXhwIjoyMDc3ODkzNjA1fQ.Fxxb6Qt6K9WAHXik86PcaNSmiagYQicAv8ONtx6Np3Q';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const email = 'enri@albaniavisit.com';

async function resendConfirmation() {
  console.log(`Looking for user: ${email}`);

  // Get user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error('Error listing users:', listError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.error(`User not found: ${email}`);
    console.log('Available users:', users.map(u => u.email));
    return;
  }

  console.log(`Found user: ${user.id}`);
  console.log(`Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);

  if (user.email_confirmed_at) {
    console.log('⚠️  Email is already confirmed!');
    return;
  }

  // Resend confirmation email using Admin API
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email: email,
    options: {
      redirectTo: 'https://texaslobby.org/auth/verify'
    }
  });

  if (error) {
    console.error('Error generating confirmation link:', error);
    return;
  }

  console.log('✅ Confirmation email resent successfully!');
  console.log('User should check their inbox for:', email);
  console.log('\nDirect verification link (for testing):');
  console.log(data.properties.action_link);
}

resendConfirmation();
