import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function findMismatches() {
  // Get all subject areas from the table
  const { data: subjects } = await supabase
    .from('subject_areas')
    .select('*')
    .order('name');

  // Get all lobbyists with their subject areas
  const { data: lobbyists } = await supabase
    .from('lobbyists')
    .select('subject_areas')
    .eq('is_active', true);

  // Count occurrences of each subject in lobbyist data
  const actualCounts: Record<string, number> = {};
  lobbyists?.forEach((lobbyist) => {
    lobbyist.subject_areas?.forEach((subject: string) => {
      actualCounts[subject] = (actualCounts[subject] || 0) + 1;
    });
  });

  console.log('Checking for mismatches...\n');

  const mismatches: Array<{subject: any, exactMatch: number, similarNames: string[]}> = [];

  subjects?.forEach((subject) => {
    const exactMatch = actualCounts[subject.name] || 0;

    // Find similar names in actual data
    const similarNames = Object.keys(actualCounts).filter(name => {
      const slugWords = subject.slug.replace(/-/g, ' ').toLowerCase();
      const nameWords = name.toLowerCase();

      // Check if slug words appear in name or vice versa
      return (nameWords.includes(slugWords) || slugWords.includes(nameWords)) && name !== subject.name;
    });

    if (exactMatch === 0 && similarNames.length > 0) {
      mismatches.push({ subject, exactMatch, similarNames });
      console.log(`❌ MISMATCH: ${subject.name} (slug: ${subject.slug})`);
      console.log(`   Exact matches: ${exactMatch}`);
      console.log(`   Similar names found in data:`);
      similarNames.forEach(name => {
        console.log(`     - "${name}" (${actualCounts[name]} lobbyists)`);
      });
      console.log();
    }
  });

  // Show top 30 most common subject areas in actual data
  console.log('\nTop 30 most common subjects in actual lobbyist data:');
  Object.entries(actualCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 30)
    .forEach(([name, count]) => {
      console.log(`  ${count.toString().padStart(4, ' ')} - ${name}`);
    });

  console.log(`\n\nTotal mismatches found: ${mismatches.length}`);
}

findMismatches();
