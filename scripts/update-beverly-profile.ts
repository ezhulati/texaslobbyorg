#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  console.log('\n✨ Updating Beverly C. Cornwell Profile\n');

  const updatedBio = `Beverly has spent over 40 years in the energy industry, with the last 13 years focused on governmental affairs at Oncor Electric Delivery. She knows Texas energy policy inside and out—from Smart Grid technology to regulatory compliance—and has built relationships across state government that help her clients navigate complex legislative issues.

Her career at Oncor (formerly TU Electric and TP&L) started in accounting and human resources, which gave her a solid foundation in how large utilities actually work. Over two decades, she moved through roles in R&D administration, employee benefits, and process improvement before finding her calling in governmental relations.

Beverly works on a surprisingly wide range of policy areas—energy, agriculture, healthcare, environmental issues, technology—basically anything that touches business in Texas. Based in the Dallas-Fort Worth area, she brings decades of hands-on experience helping clients understand what's happening in Austin and how it affects their bottom line.`;

  const updateData: any = {
    bio: updatedBio,
    profile_image_url: '/images/Beverly_C_Cornwell.jpg',
    years_experience: 40, // 40+ years total experience
    linkedin_url: 'https://www.linkedin.com/in/beverly-c-91a2821/'
  };

  const { data, error } = await supabase
    .from('lobbyists')
    .update(updateData)
    .eq('slug', 'beverly-c-cornwell')
    .select();

  if (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('linkedin_url')) {
      console.log('\n📝 Note: You need to add the linkedin_url column to the lobbyists table first.');
      console.log('   Run this SQL in Supabase Studio:');
      console.log('   ALTER TABLE public.lobbyists ADD COLUMN linkedin_url TEXT;');
    }
  } else {
    console.log('✓ Successfully updated Beverly C. Cornwell profile');
    console.log('\nUpdated fields:');
    console.log('  - Bio (enhanced with LinkedIn data)');
    console.log('  - Profile image: /images/Beverly_C_Cornwell.jpg');
    console.log('  - Years of experience: 40+');
    if (data?.[0]?.linkedin_url) {
      console.log('  - LinkedIn: https://www.linkedin.com/in/beverly-c-91a2821/');
    }
  }
}

main().catch(console.error);
