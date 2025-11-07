import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function countLobbyists() {
  // Total count
  const { count: total } = await supabase
    .from('lobbyists')
    .select('*', { count: 'exact', head: true });

  // Active count
  const { count: active } = await supabase
    .from('lobbyists')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  // Featured lobbyists
  const featuredSlugs = ['michael-toomey', 'vera-denise-rose', 'robert-d-miller'];

  // Non-featured count
  const { count: nonFeatured } = await supabase
    .from('lobbyists')
    .select('*', { count: 'exact', head: true })
    .not('slug', 'in', `(${featuredSlugs.join(',')})`);

  // Short bio count (non-featured)
  const { data: allNonFeatured } = await supabase
    .from('lobbyists')
    .select('bio, slug')
    .not('slug', 'in', `(${featuredSlugs.join(',')})`);

  const shortBio = allNonFeatured?.filter(l => !l.bio || l.bio.trim().length < 100).length || 0;

  console.log('Lobbyist Counts:');
  console.log(`  Total lobbyists: ${total}`);
  console.log(`  Active lobbyists: ${active}`);
  console.log(`  Non-featured lobbyists: ${nonFeatured}`);
  console.log(`  Non-featured with short bios (<100 chars): ${shortBio}`);
  console.log(`\n  Difference between non-featured and short bios: ${(nonFeatured || 0) - shortBio}`);
}

countLobbyists();
