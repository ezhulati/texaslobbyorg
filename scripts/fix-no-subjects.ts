import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function fixNoSubjects() {
  const slugs = ['jordan-berry', 'thomas-t-townsend', 'pasha-moore', 'curtis-fuelberg'];

  console.log('Adding "Other" subject to lobbyists with no subjects...\n');

  for (const slug of slugs) {
    const { error } = await supabase
      .from('lobbyists')
      .update({ subject_areas: ['Other'] })
      .eq('slug', slug);

    if (error) {
      console.error(`❌ Error updating ${slug}: ${error.message}`);
    } else {
      console.log(`✅ Added 'Other' subject to ${slug}`);
    }
  }

  console.log('\n✅ Done!');
}

fixNoSubjects();
