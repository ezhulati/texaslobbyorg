import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to generate a bio based on lobbyist data
function generateBio(lobbyist: any, clients: any[]): string {
  const name = `${lobbyist.first_name} ${lobbyist.last_name}`;
  const cities = lobbyist.cities || [];
  const subjects = lobbyist.subject_areas || [];

  // Build bio parts
  const parts: string[] = [];

  // Opening statement based on available data
  if (subjects.length > 0 && cities.length > 0) {
    const cityText = cities.length === 1 ? cities[0] : cities.slice(0, 2).join(' and ');
    const subjectList = subjects.length <= 2
      ? subjects.join(' and ')
      : `${subjects.slice(0, 2).join(', ')}, and ${subjects[2]}`;

    parts.push(`${name} is a registered Texas lobbyist based in ${cityText}, specializing in ${subjectList}.`);
  } else if (subjects.length > 0) {
    const subjectList = subjects.length <= 2
      ? subjects.join(' and ')
      : `${subjects.slice(0, 2).join(', ')}, and ${subjects[2]}`;

    parts.push(`${name} is a registered Texas lobbyist specializing in ${subjectList}.`);
  } else if (cities.length > 0) {
    const cityText = cities.length === 1 ? cities[0] : cities.slice(0, 2).join(' and ');
    parts.push(`${name} is a registered Texas lobbyist serving clients in ${cityText}.`);
  } else {
    parts.push(`${name} is a registered Texas lobbyist.`);
  }

  // Add client information if available
  if (clients.length > 0) {
    const clientCount = clients.length;
    if (clientCount === 1) {
      parts.push(`They represent ${clients[0].name} before the Texas Legislature.`);
    } else if (clientCount === 2) {
      parts.push(`They represent ${clients[0].name} and ${clients[1].name} before the Texas Legislature.`);
    } else {
      parts.push(`With experience representing ${clientCount} clients, they advocate for diverse interests before the Texas Legislature and state agencies.`);
    }
  } else {
    // No clients, focus on expertise
    if (subjects.length > 3) {
      parts.push(`Their broad expertise across multiple policy areas allows them to effectively advocate for clients before the Texas Legislature and state agencies.`);
    } else if (subjects.length > 0) {
      parts.push(`They work with businesses and organizations to navigate Texas government relations and advance their policy objectives.`);
    }
  }

  // Add a closing statement about registration
  if (lobbyist.is_active) {
    parts.push(`${name} maintains active registration with the Texas Ethics Commission.`);
  }

  return parts.join(' ');
}

async function generateBiosForLobbyists() {
  console.log('Starting bio generation for lobbyists...\n');

  // Get featured lobbyists to exclude
  const featuredSlugs = ['michael-toomey', 'vera-denise-rose', 'robert-d-miller'];

  // Get ALL lobbyists with pagination (Supabase has 1000 record default limit)
  let allLobbyists: any[] = [];
  let page = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error: fetchError } = await supabase
      .from('lobbyists')
      .select('*')
      .not('slug', 'in', `(${featuredSlugs.join(',')})`)
      .order('last_name')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (fetchError) {
      console.error('Error fetching lobbyists:', fetchError);
      return;
    }

    if (data && data.length > 0) {
      allLobbyists = [...allLobbyists, ...data];
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  console.log(`Fetched ${allLobbyists.length} total lobbyists from database`);

  // Filter for lobbyists with bios shorter than 100 characters (inadequate bios)
  const lobbyists = allLobbyists.filter(l => !l.bio || l.bio.trim().length < 100);

  const error = null;

  if (error) {
    console.error('Error fetching lobbyists:', error);
    return;
  }

  if (!lobbyists || lobbyists.length === 0) {
    console.log('No lobbyists found without bios.');
    return;
  }

  console.log(`Found ${lobbyists.length} lobbyists without bios.\n`);

  let updated = 0;
  let failed = 0;

  // Process in batches of 10
  const batchSize = 10;
  for (let i = 0; i < lobbyists.length; i += batchSize) {
    const batch = lobbyists.slice(i, i + batchSize);

    console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(lobbyists.length / batchSize)}...`);

    for (const lobbyist of batch) {
      try {
        // Get clients for this lobbyist
        const { data: clients } = await supabase
          .from('clients')
          .select('name, description')
          .eq('lobbyist_id', lobbyist.id)
          .limit(10);

        // Generate bio
        const bio = generateBio(lobbyist, clients || []);

        // Update lobbyist with bio
        const { error: updateError } = await supabase
          .from('lobbyists')
          .update({ bio })
          .eq('id', lobbyist.id);

        if (updateError) {
          console.error(`  ✗ Failed to update ${lobbyist.first_name} ${lobbyist.last_name}:`, updateError.message);
          failed++;
        } else {
          console.log(`  ✓ Updated ${lobbyist.first_name} ${lobbyist.last_name}`);
          updated++;
        }
      } catch (err) {
        console.error(`  ✗ Error processing ${lobbyist.first_name} ${lobbyist.last_name}:`, err);
        failed++;
      }
    }

    // Add a small delay between batches to avoid rate limiting
    if (i + batchSize < lobbyists.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n✅ Bio generation complete!');
  console.log(`   Updated: ${updated}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Total: ${lobbyists.length}`);
}

// Run the script
generateBiosForLobbyists().catch(console.error);
