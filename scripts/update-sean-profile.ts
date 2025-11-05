#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  console.log('\n✨ Updating Sean Abbott Profile\n');

  const updatedBio = `Sean specializes in helping water districts and developers navigate the complex world of municipal infrastructure financing in Central Texas. He works with clients on everything from creating new water districts to negotiating with municipalities on utility agreements—basically helping communities get the water, sewer, drainage, and roads they need to grow.

His path to this work was hands-on: he started in the Texas Legislature working for both House and Senate members, then spent two years as an Assistant Attorney General in the Public Finance Division. That government experience gave him a real understanding of how these deals work from the inside. Since then, he's been practicing law at firms including Allen Boone Humphries Robinson and now Armbrust & Brown, where he became a Member in 2023.

Sean graduated from UT Austin in 2005 and got his law degree from South Texas College of Law in 2009. He's active in conservation work—currently serving on the Hill Country Conservancy board—and previously helped lead the Urban Land Institute's Austin chapter. Based in Austin, Sean brings practical experience and strong relationships across state agencies, from TCEQ to the Attorney General's office, to help clients get infrastructure projects financed and built.`;

  const updateData: any = {
    bio: updatedBio,
    profile_image_url: '/images/sean-abbott.jpg',
    years_experience: 16, // Licensed since 2009
    linkedin_url: 'https://www.linkedin.com/in/sean-david-abbott-b1871b1b/'
  };

  const { data, error } = await supabase
    .from('lobbyists')
    .update(updateData)
    .eq('slug', 'sean-abbott')
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✓ Successfully updated Sean Abbott profile');
    console.log('\nUpdated fields:');
    console.log('  - Bio (written from LinkedIn and firm website data)');
    console.log('  - Profile image: /images/sean-abbott.jpg');
    console.log('  - Years of experience: 16');
    console.log('  - LinkedIn: https://www.linkedin.com/in/sean-david-abbott-b1871b1b/');
  }
}

main().catch(console.error);
