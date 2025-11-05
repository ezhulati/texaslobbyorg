import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking featured lobbyists and their profile photos...\n');

try {
  const { data, error } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, slug, profile_image_url, subscription_tier, featured_order')
    .eq('subscription_tier', 'featured')
    .eq('is_active', true)
    .order('featured_order', { nullsFirst: false });

  if (error) {
    console.error('❌ Supabase Error:', error.message);
    process.exit(1);
  }

  console.log(`Found ${data.length} featured lobbyists:\n`);

  data.forEach((lobbyist, index) => {
    console.log(`${index + 1}. ${lobbyist.first_name} ${lobbyist.last_name}`);
    console.log(`   Slug: ${lobbyist.slug}`);
    console.log(`   Profile Image: ${lobbyist.profile_image_url || '❌ NO PHOTO'}`);
    console.log(`   Featured Order: ${lobbyist.featured_order || 'null'}`);
    console.log('');
  });

  // Count how many have photos
  const withPhotos = data.filter(l => l.profile_image_url).length;
  const withoutPhotos = data.filter(l => !l.profile_image_url).length;

  console.log(`Summary: ${withPhotos} with photos, ${withoutPhotos} without photos`);

  process.exit(0);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  process.exit(1);
}
