import { createClient } from '@supabase/supabase-js';

// Load env manually for script
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://gpwmxaslvcwilqufxvug.supabase.co';
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd214YXNsdmN3aWxxdWZ4dnVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3MTQ3MDUsImV4cCI6MjA0OTI5MDcwNX0.eGHdUQ55v7gYXqUC4MO5OVuXI-QxlvPmVDTZGsPTm20';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findTestLobbyist() {
  console.log('Finding unclaimed, active lobbyists for testing...\n');

  const { data, error } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, email, cities')
    .eq('is_active', true)
    .eq('is_claimed', false)
    .limit(10);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length || 0} unclaimed lobbyists:\n`);

  if (data && data.length > 0) {
    data.forEach((lobbyist, index) => {
      console.log(`${index + 1}. ${lobbyist.first_name} ${lobbyist.last_name}`);
      console.log(`   Email: ${lobbyist.email || 'No email'}`);
      console.log(`   Cities: ${lobbyist.cities?.join(', ') || 'None'}`);
      console.log('');
    });
  } else {
    console.log('No unclaimed lobbyists found!');
  }
}

findTestLobbyist();
