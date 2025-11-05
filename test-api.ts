// Quick test script to verify search and profile API functions
import { searchLobbyists, getLobbyistBySlug } from './src/lib/api/lobbyists';

async function runTests() {
  console.log('🧪 Testing TexasLobby.org API Functions\n');

  try {
    // Test 1: Search all lobbyists
    console.log('Test 1: Searching all lobbyists...');
    const allLobbyists = await searchLobbyists({ limit: 10 });
    console.log(`✅ Found ${allLobbyists.length} lobbyists`);
    if (allLobbyists.length > 0) {
      console.log(`   First result: ${allLobbyists[0].first_name} ${allLobbyists[0].last_name}`);
    }
    console.log('');

    // Test 2: Search by city
    console.log('Test 2: Searching lobbyists in Austin...');
    const austinLobbyists = await searchLobbyists({ cities: ['austin'], limit: 10 });
    console.log(`✅ Found ${austinLobbyists.length} lobbyists in Austin`);
    console.log('');

    // Test 3: Search by subject area
    console.log('Test 3: Searching lobbyists in Healthcare...');
    const healthcareLobbyists = await searchLobbyists({ subjects: ['Healthcare'], limit: 10 });
    console.log(`✅ Found ${healthcareLobbyists.length} healthcare lobbyists`);
    console.log('');

    // Test 4: Search by tier
    console.log('Test 4: Searching featured lobbyists...');
    const featuredLobbyists = await searchLobbyists({ tier: 'featured', limit: 10 });
    console.log(`✅ Found ${featuredLobbyists.length} featured lobbyists`);
    console.log('');

    // Test 5: Get specific lobbyist by slug
    if (allLobbyists.length > 0) {
      const firstSlug = allLobbyists[0].slug;
      console.log(`Test 5: Fetching lobbyist by slug '${firstSlug}'...`);
      const lobbyist = await getLobbyistBySlug(firstSlug);
      if (lobbyist) {
        console.log(`✅ Found: ${lobbyist.first_name} ${lobbyist.last_name}`);
        console.log(`   Email: ${lobbyist.email || 'Not provided'}`);
        console.log(`   Cities: ${lobbyist.cities.join(', ')}`);
        console.log(`   Subject Areas: ${lobbyist.subject_areas.join(', ')}`);
        console.log(`   Tier: ${lobbyist.subscription_tier}`);
        console.log(`   View Count: ${lobbyist.view_count}`);
      } else {
        console.log('❌ Failed to fetch lobbyist');
      }
    }
    console.log('');

    console.log('✨ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
