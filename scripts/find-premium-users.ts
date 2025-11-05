#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  console.log('\n📊 Premium and Featured Lobbyists:\n');

  // Get featured lobbyists
  const { data: featured } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, slug, subscription_tier, bio, profile_image_url, cities, subject_areas')
    .eq('subscription_tier', 'featured')
    .eq('is_active', true)
    .order('last_name');

  console.log(`🌟 Featured (${featured?.length || 0}):`);
  featured?.forEach((l, i) => {
    console.log(`${i + 1}. ${l.first_name} ${l.last_name}`);
    console.log(`   Slug: ${l.slug}`);
    console.log(`   Cities: ${l.cities?.join(', ') || 'None'}`);
    console.log(`   Subjects: ${l.subject_areas?.slice(0, 3).join(', ') || 'None'}${l.subject_areas?.length > 3 ? ` +${l.subject_areas.length - 3} more` : ''}`);
    console.log(`   Bio: ${l.bio ? l.bio.substring(0, 60) + '...' : 'EMPTY'}`);
    console.log(`   Image: ${l.profile_image_url || 'NONE'}`);
    console.log('');
  });

  // Get premium lobbyists
  const { data: premium } = await supabase
    .from('lobbyists')
    .select('id, first_name, last_name, slug, subscription_tier, bio, profile_image_url, cities, subject_areas')
    .eq('subscription_tier', 'premium')
    .eq('is_active', true)
    .order('last_name');

  console.log(`\n💎 Premium (${premium?.length || 0}):`);
  premium?.forEach((l, i) => {
    console.log(`${i + 1}. ${l.first_name} ${l.last_name}`);
    console.log(`   Slug: ${l.slug}`);
    console.log(`   Cities: ${l.cities?.join(', ') || 'None'}`);
    console.log(`   Subjects: ${l.subject_areas?.slice(0, 3).join(', ') || 'None'}${l.subject_areas?.length > 3 ? ` +${l.subject_areas.length - 3} more` : ''}`);
    console.log(`   Bio: ${l.bio ? l.bio.substring(0, 60) + '...' : 'EMPTY'}`);
    console.log(`   Image: ${l.profile_image_url || 'NONE'}`);
    console.log('');
  });
}

main().catch(console.error);
