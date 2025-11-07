import { createClient } from '@supabase/supabase-js';

// Use service role key to bypass RLS
const supabase = createClient(
  'https://tavwfbqflredtowjelbx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhdndmYnFmbHJlZHRvd2plbGJ4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjMxNzYwNSwiZXhwIjoyMDc3ODkzNjA1fQ.Fxxb6Qt6K9WAHXik86PcaNSmiagYQicAv8ONtx6Np3Q'
);

console.log('Updating Mike Toomey profile...\n');

// Craft comprehensive bio based on extensive background information
const bio = `Mike Toomey is a Partner at Texas Lobby Partners and widely recognized as the premier business lobbyist in Texas. Ranked as the Top Hired Gun Lobbyist by Capitol Inside in 2021 and rated in the top five hired gun lobbyists every year since entering the profession, Mike has maintained his position at the pinnacle of Texas government relations for over two decades. Capitol Inside inducted him into the Texas Lobby Hall of Fame (2005-2019), noting he has "all but owned the top of the mountain" in their power rankings since their inception.

Mike holds a distinction unmatched in Texas political history: he is the only person ever to serve as chief of staff for two Texas Governors. He served Governor Rick Perry from 2002-2004, with the Governor crediting him for being "a major factor in the successes of the 2003 legislative session," and Governor Bill Clements from 1989-1990, who praised his "hard work" contributing "significantly to the success of the regular session." Most recently, he served as Senior Advisor and Chief Operating Officer to Governor Abbott's Strike Force to Open Texas in 2020, with Governor Abbott calling him "a proven chief operating officer who knows how to quickly deliver results."

During his distinguished legislative career as a three-term Texas House member representing HD 135 in Houston (1983-1988), Mike earned exceptional recognition for his effectiveness and policy expertise. Named Best House Freshman by the Fort Worth Star-Telegram in his first term, he went on to be named one of the Ten Best Legislators by Texas Monthly Magazine and one of the Seven Best Legislators by the Dallas Morning News. As Chairman of the House Judiciary Committee, he successfully sponsored landmark tort reform legislation and was honored with the American Tort Reform Association's "Tort Reformer" award in 1987. Colleagues described him as someone who "read every single bill that was filed" and possessed "all the qualities essential to mastering this most difficult of legislative arts."

A graduate of South Texas College of Law (J.D., 1976) and Baylor University (B.A. Philosophy, 1972), Mike has built his career on an extraordinary work ethic and encyclopedic knowledge of state government. The New York Times has called him "the leading business lobbyist in Texas," while Texas Monthly noted his "legendary" work ethic and "zeal and tenacity that even his detractors admire." His approach to lobbying is characterized by meticulous preparation, comprehensive issue knowledge, and an unmatched dedication to delivering results for his clients.

Based in Austin, Mike continues to be the go-to strategist for businesses and prominent individuals seeking to navigate Texas government. His influence extends across every major policy area, built on decades of relationships, unparalleled institutional knowledge, and a track record of success that has made him a fixture at the top of every credible ranking of Texas lobbyists for the past twenty years.`;

// Update Mike's profile
const { data: mike, error: findError } = await supabase
  .from('lobbyists')
  .select('id, first_name, last_name')
  .eq('slug', 'michael-toomey')
  .single();

if (findError || !mike) {
  console.error('❌ Mike Toomey not found:', findError);
  process.exit(1);
}

console.log(`✓ Found ${mike.first_name} ${mike.last_name}`);

const { error: updateError } = await supabase
  .from('lobbyists')
  .update({
    bio: bio,
    profile_image_url: '/images/Mike-Toomey.jpg',
    years_experience: 40,
    website: 'https://texaslobbypartners.com/'
  })
  .eq('id', mike.id);

if (updateError) {
  console.error('❌ Update failed:', updateError.message);
  process.exit(1);
}

console.log('\n✅ Successfully updated Mike Toomey profile!');
console.log('\nUpdated fields:');
console.log('  - Bio: 5-paragraph professional biography');
console.log('  - Profile image: /images/Mike-Toomey.jpg');
console.log('  - Years experience: 40+');
console.log('  - Website: https://texaslobbypartners.com/');
console.log('\n  View profile: http://localhost:4321/lobbyists/michael-toomey');
