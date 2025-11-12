import { createClient } from '@supabase/supabase-js';

// Load env manually for script
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://gpwmxaslvcwilqufxvug.supabase.co';
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd214YXNsdmN3aWxxdWZ4dnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3MTQ3MDUsImV4cCI6MjA0OTI5MDcwNX0.eGHdUQ55v7gYXqUC4MO5OVuXI-QxlvPmVDTZGsPTm20';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClayBird() {
  console.log('Searching for Clay Byrd...\n');

  // Search by last name
  const { data, error } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, email, is_claimed, is_active')
    .ilike('last_name', '%byrd%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} lobbyist(s) with "Bird" in last name:\n`);

  if (data && data.length > 0) {
    data.forEach((lobbyist) => {
      console.log('---');
      console.log(`Name: ${lobbyist.first_name} ${lobbyist.last_name}`);
      console.log(`Email: ${lobbyist.email}`);
      console.log(`ID: ${lobbyist.id}`);
      console.log(`Claimed: ${lobbyist.is_claimed}`);
      console.log(`Active: ${lobbyist.is_active}`);
      console.log('---\n');
    });
  }

  // Also try searching with the autocomplete logic
  console.log('\nTesting autocomplete search logic for "Clay Byrd"...\n');

  const nameParts = 'Clay Byrd'.trim().split(/\s+/);
  const [firstName, ...lastNameParts] = nameParts;
  const lastName = lastNameParts.join(' ');

  const { data: autocompleteData, error: autocompleteError } = await supabase
    .from('lobbyists')
    .select('*')
    .eq('is_active', true)
    .eq('is_claimed', false)
    .ilike('first_name', `%${firstName}%`)
    .ilike('last_name', `%${lastName}%`)
    .limit(5);

  if (autocompleteError) {
    console.error('Autocomplete error:', autocompleteError);
    return;
  }

  console.log(`Autocomplete found ${autocompleteData?.length || 0} results:\n`);

  if (autocompleteData && autocompleteData.length > 0) {
    autocompleteData.forEach((lobbyist) => {
      console.log('---');
      console.log(`Name: ${lobbyist.first_name} ${lobbyist.last_name}`);
      console.log(`Email: ${lobbyist.email}`);
      console.log(`Claimed: ${lobbyist.is_claimed}`);
      console.log(`Active: ${lobbyist.is_active}`);
      console.log('---\n');
    });
  }
}

checkClayBird();
