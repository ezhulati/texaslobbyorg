import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBioQuality() {
  console.log('Checking bio quality...\n');

  // Get all lobbyists with bios
  const { data: lobbyists, error } = await supabase
    .from('lobbyists')
    .select('first_name, last_name, bio')
    .not('bio', 'is', null)
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Sample of current bios:\n');
  lobbyists?.forEach((l, i) => {
    console.log(`${i + 1}. ${l.first_name} ${l.last_name}`);
    console.log(`   Bio: "${l.bio}"`);
    console.log(`   Length: ${l.bio?.length} chars\n`);
  });

  // Get stats
  const { data: allLobbyists } = await supabase
    .from('lobbyists')
    .select('bio');

  const withBio = allLobbyists?.filter(l => l.bio && l.bio.trim().length > 0).length || 0;
  const shortBio = allLobbyists?.filter(l => l.bio && l.bio.trim().length < 100).length || 0;
  const noBio = allLobbyists?.filter(l => !l.bio || l.bio.trim().length === 0).length || 0;

  console.log('\nStatistics:');
  console.log(`  Total lobbyists: ${allLobbyists?.length}`);
  console.log(`  With bio: ${withBio}`);
  console.log(`  Short bio (<100 chars): ${shortBio}`);
  console.log(`  No bio: ${noBio}`);
}

checkBioQuality();
