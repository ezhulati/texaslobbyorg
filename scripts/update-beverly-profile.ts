#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  console.log('\n✨ Updating Beverly C. Cornwell Profile\n');

  const updatedBio = `Senior Governmental Affairs Analyst at Oncor Electric Delivery with over 13 years of expertise in governmental relations, energy policy, and regulatory affairs. Beverly brings extensive experience from her 21+ years with Oncor (formerly TU Electric and TP&L), progressing through various roles including Accounting Analyst Specialist, R&D Administrator, and HR Assistant.

Her comprehensive background spans employee benefits, change management, process improvement, human resources, insurance, department budgeting, and financial analysis. Beverly excels in program management, project planning, business process improvement, and strategic planning, with specialized knowledge in energy sector regulations and Smart Grid technology.

Based in the Dallas-Fort Worth Metroplex, Beverly provides sophisticated governmental affairs analysis across a remarkably broad range of policy areas including agriculture, healthcare, environmental issues, and technology. Her versatile skill set and deep understanding of Texas energy markets make her an invaluable resource for clients navigating complex regulatory environments. With endorsements in key competencies including budgets, energy, project management, and governmental affairs, Beverly delivers strategic counsel grounded in decades of industry experience.`;

  const updateData: any = {
    bio: updatedBio,
    profile_image_url: '/images/Beverly_C_Cornwell.jpg',
    years_experience: 40, // 40+ years total experience
    // Note: linkedin_url will be added in a separate migration
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
