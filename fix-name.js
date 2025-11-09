// Fix first and last name from user_metadata
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tavwfbqflredtowjelbx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMxNzYwNSwiZXhwIjoyMDc3ODkzNjA1fQ.Fxxb6Qt6K9WAHXik86PcaNSmiagYQicAv8ONtx6Np3Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const userId = '95340197-a8df-4827-969e-8f1d5a957415';

async function fixName() {
  // Get auth user metadata
  const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);

  if (authError || !user) {
    console.error('Error getting auth user:', authError);
    return;
  }

  const firstName = user.user_metadata?.first_name || 'Enri';
  const lastName = user.user_metadata?.last_name || 'Test';

  console.log(`Updating name to: ${firstName} ${lastName}`);

  const { data, error } = await supabase
    .from('users')
    .update({
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating name:', error);
    return;
  }

  console.log('✅ Name updated successfully!');
  console.log(data);
}

fixName();
