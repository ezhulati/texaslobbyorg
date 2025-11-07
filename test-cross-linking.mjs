// Quick test to verify subject-to-industry cross-linking
import { getIndustriesForSubject } from './src/lib/industries-data.ts';

const testSubjects = [
  'Healthcare',
  'Health And Health Care',
  'Energy',
  'Technology',
  'Gaming & Lotteries',
  'Education',
  'Insurance',
  'Telecommunications',
  'Municipal Government',
  'Environment',
  'Tourism',
  'Public Health'
];

console.log('Testing subject-to-industry mappings:\n');

testSubjects.forEach(subject => {
  const industries = getIndustriesForSubject(subject);
  console.log(`"${subject}" → ${industries.length} industrie(s):`);
  industries.forEach(ind => console.log(`  - ${ind.name} (${ind.slug})`));
  console.log('');
});
