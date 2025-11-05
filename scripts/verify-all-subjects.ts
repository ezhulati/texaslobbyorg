import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function verifyAllSubjects() {
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

  console.log('Subject Areas in Database and their Lobbyist Counts:\n');

  const subjectsWithZero: string[] = [];

  subjects?.forEach((subject) => {
    const count = actualCounts[subject.name] || 0;
    const emoji = count === 0 ? '❌' : count < 10 ? '⚠️ ' : '✅';
    console.log(`${emoji} ${subject.name.padEnd(50)} ${count.toString().padStart(4)} lobbyists`);

    if (count === 0) {
      subjectsWithZero.push(subject.name);
    }
  });

  if (subjectsWithZero.length > 0) {
    console.log(`\n\n⚠️  ${subjectsWithZero.length} subjects have no lobbyists:`);
    subjectsWithZero.forEach(name => console.log(`  - ${name}`));
  } else {
    console.log('\n\n✅ All subjects have at least one lobbyist!');
  }
}

verifyAllSubjects();
