#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  console.log('\n✨ Updating Dana S. Chiodo Profile\n');

  const updatedBio = `Dana has been working in Texas government relations since 1984, and she's been running her own consulting practice since 1999. With over 40 years in the field, she knows the ins and outs of the Texas Legislature and has built lasting relationships that help her clients get things done.

Her career started at major law firms—five years at Jones Day followed by nearly a decade at Roan and Autrey—before she decided to strike out on her own with Dana Chiodo Consulting. That independence has given her the flexibility to work closely with clients on everything from legislative strategy to public relations.

Dana studied at the University of Texas at Austin (with a year in Stockholm, Sweden before that), and she's stayed deeply connected to the Austin community. She even served on the American Lung Association board for several years. Based in Austin, Dana brings decades of legislative experience and a straightforward approach to helping clients navigate state government.`;

  const updateData: any = {
    bio: updatedBio,
    profile_image_url: '/images/Diana_Chiodo.jpg',
    years_experience: 40, // 40+ years in government relations
    linkedin_url: 'https://www.linkedin.com/in/dana-chiodo-17b7b925/'
  };

  const { data, error } = await supabase
    .from('lobbyists')
    .update(updateData)
    .eq('slug', 'dana-s-chiodo')
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✓ Successfully updated Dana S. Chiodo profile');
    console.log('\nUpdated fields:');
    console.log('  - Bio (written from LinkedIn data)');
    console.log('  - Profile image: /images/Diana_Chiodo.jpg');
    console.log('  - Years of experience: 40+');
    console.log('  - LinkedIn: https://www.linkedin.com/in/dana-chiodo-17b7b925/');
  }
}

main().catch(console.error);
