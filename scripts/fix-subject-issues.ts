import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function fixSubjectIssues() {
  console.log('Fixing subject issues...\n');

  // 1. Remove duplicate Health And Health Care entries (keep one)
  const { data: healthcareEntries } = await supabase
    .from('subject_areas')
    .select('*')
    .eq('name', 'Health And Health Care')
    .order('created_at');

  if (healthcareEntries && healthcareEntries.length > 1) {
    console.log(`Found ${healthcareEntries.length} duplicate Healthcare entries`);
    // Keep the first one, delete others
    for (let i = 1; i < healthcareEntries.length; i++) {
      const { error } = await supabase
        .from('subject_areas')
        .delete()
        .eq('id', healthcareEntries[i].id);

      if (!error) {
        console.log(`✅ Deleted duplicate Healthcare entry: ${healthcareEntries[i].id}`);
      } else {
        console.error(`❌ Error deleting: ${error.message}`);
      }
    }
  }

  // 2. Delete subjects with 0 lobbyists
  const zeroLobbyistSubjects = ['Financial Services', 'Municipal/County', 'Technology'];

  for (const name of zeroLobbyistSubjects) {
    const { error } = await supabase
      .from('subject_areas')
      .delete()
      .eq('name', name);

    if (!error) {
      console.log(`✅ Deleted subject with 0 lobbyists: ${name}`);
    } else {
      console.error(`❌ Error deleting ${name}: ${error.message}`);
    }
  }

  // 3. Update subjects with very low counts to match actual data
  const updates = [
    { old: 'Criminal Justice', new: 'Crime' },
    { old: 'Environmental', new: 'Environment' },
    { old: 'Labor & Employment', new: 'Labor' },
    { old: 'Real Estate', new: 'Property Interests' }
  ];

  for (const { old: oldName, new: newName } of updates) {
    const { error } = await supabase
      .from('subject_areas')
      .delete()
      .eq('name', oldName);

    if (!error) {
      console.log(`✅ Deleted low-count subject: ${oldName} (data exists under "${newName}")`);
    } else {
      console.error(`❌ Error deleting ${oldName}: ${error.message}`);
    }
  }

  console.log('\n✅ All subject issues fixed!');
}

fixSubjectIssues();
