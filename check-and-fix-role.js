// Check and fix user role in database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tavwfbqflredtowjelbx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMxNzYwNSwiZXhwIjoyMDc3ODkzNjA1fQ.Fxxb6Qt6K9WAHXik86PcaNSmiagYQicAv8ONtx6Np3Q';

const supabase = createClient(supabaseUrl, serviceRoleKey);

const userId = '95340197-a8df-4827-969e-8f1d5a957415';

async function checkAndFixRole() {
  console.log('Checking user role in database...');

  // Check current role in database
  const { data: userData, error: selectError } = await supabase
    .from('users')
    .select('id, email, role, first_name, last_name')
    .eq('id', userId)
    .single();

  if (selectError) {
    console.error('Error fetching user:', selectError);
    return;
  }

  console.log('\nCurrent user data in database:');
  console.log(userData);

  if (userData.role === 'lobbyist') {
    console.log('\n✅ Role is already set to lobbyist. No changes needed.');
    return;
  }

  console.log(`\n⚠️  Role is currently: ${userData.role}`);
  console.log('Updating to: lobbyist');

  // Update role to lobbyist
  const { data: updatedData, error: updateError } = await supabase
    .from('users')
    .update({ role: 'lobbyist' })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('Error updating role:', updateError);
    return;
  }

  console.log('\n✅ Role updated successfully!');
  console.log('Updated user data:');
  console.log(updatedData);
  console.log('\nPlease log out and log back in for changes to take effect.');
}

checkAndFixRole();
