import { createClient } from '@supabase/supabase-js';
import { calculateSimilarLobbyists } from './src/lib/utils/similarity';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugSimilarLobbyists() {
  // Get the E Lobby profile (using email to find it)
  const { data: currentLobbyist } = await supabase
    .from('lobbyists')
    .select(`
      *,
      clients (
        id,
        name,
        description
      )
    `)
    .eq('email', 'enri@albaniavisit.com')
    .single();

  if (!currentLobbyist) {
    console.log('❌ Current lobbyist not found');
    return;
  }

  console.log('🔍 Current Lobbyist:', currentLobbyist.first_name, currentLobbyist.last_name);
  console.log('   Cities:', currentLobbyist.cities);
  console.log('   Subject Areas:', currentLobbyist.subject_areas);
  console.log('   Clients:', currentLobbyist.clients?.length || 0);

  // Fetch candidate lobbyists
  const { data: candidates } = await supabase
    .from('lobbyists')
    .select(`
      *,
      clients (
        id,
        name,
        description
      )
    `)
    .eq('is_active', true)
    .neq('id', currentLobbyist.id)
    .limit(50);

  console.log('\n📊 Found', candidates?.length || 0, 'candidate lobbyists');

  // Calculate similar lobbyists WITHOUT limit to see all scores
  const allSimilar = candidates ? calculateSimilarLobbyists(
    { ...currentLobbyist, clients: currentLobbyist.clients?.map((c: any) => ({ name: c.name, description: c.description })) },
    candidates,
    50 // High limit to see all results
  ) : [];

  console.log('\n✅ Similar lobbyists found:', allSimilar.length);
  console.log('\nTop 10 Similar Lobbyists:');
  allSimilar.slice(0, 10).forEach((similar, index) => {
    console.log(`\n${index + 1}. ${similar.first_name} ${similar.last_name}`);
    console.log(`   Score: ${similar.similarityScore}`);
    console.log(`   Matching Cities: ${similar.matchingCities.join(', ') || 'none'}`);
    console.log(`   Matching Subjects: ${similar.matchingSubjects.join(', ') || 'none'}`);
    console.log(`   Shared Industries: ${similar.sharedIndustries.join(', ') || 'none'}`);
  });

  // Check how many have score > 0
  const withScore = allSimilar.filter(s => s.similarityScore > 0);
  console.log(`\n📈 Lobbyists with score > 0: ${withScore.length}`);

  // Check how many lobbyists share "Aliens" subject area
  const withAliens = candidates?.filter((c: any) => c.subject_areas?.includes('Aliens')) || [];
  console.log(`\n👽 Lobbyists with "Aliens" in candidate pool: ${withAliens.length}`);
  withAliens.forEach((l: any) => {
    console.log(`   - ${l.first_name} ${l.last_name} (${l.slug})`);
  });

  // Now check total in database
  const { data: allWithAliens } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, slug, subject_areas')
    .eq('is_active', true)
    .neq('id', currentLobbyist.id);

  const totalWithAliens = allWithAliens?.filter((l: any) => l.subject_areas?.includes('Aliens')) || [];
  console.log(`\n🌍 Total lobbyists with "Aliens" in database: ${totalWithAliens.length}`);
  totalWithAliens.forEach((l: any) => {
    console.log(`   - ${l.first_name} ${l.last_name} (${l.slug})`);
  });

  console.log(`\n⚠️ MISSING FROM CANDIDATE POOL: ${totalWithAliens.length - withAliens.length} lobbyists`);
}

debugSimilarLobbyists().catch(console.error);
