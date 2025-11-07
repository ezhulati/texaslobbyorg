import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMediumBios() {
  const featuredSlugs = ['michael-toomey', 'vera-denise-rose', 'robert-d-miller'];

  const { data } = await supabase
    .from('lobbyists')
    .select('first_name, last_name, bio')
    .not('slug', 'in', `(${featuredSlugs.join(',')})`);

  const mediumBios = data?.filter(l => l.bio && l.bio.trim().length >= 100 && l.bio.trim().length < 300) || [];

  console.log(`Found ${mediumBios.length} lobbyists with bios between 100-300 characters:\n`);

  mediumBios.slice(0, 20).forEach((l, i) => {
    console.log(`${i + 1}. ${l.first_name} ${l.last_name}`);
    console.log(`   Length: ${l.bio?.length}`);
    console.log(`   Bio: "${l.bio}"\n`);
  });
}

checkMediumBios();
