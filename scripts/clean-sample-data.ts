#!/usr/bin/env tsx

import { config } from 'dotenv';
import { createServiceClient } from './import-utils';

config();

async function main() {
  const supabase = createServiceClient();

  // Delete sample lobbyists that were created for testing
  // These are the ones showing without avatars
  const sampleNames = [
    { first: 'Jennifer', last: 'Brown' },
    { first: 'James', last: 'Martinez' },
    { first: 'Michael', last: 'Smith' },
  ];

  console.log('🧹 Cleaning up sample data...\n');

  for (const name of sampleNames) {
    const { data, error } = await supabase
      .from('lobbyists')
      .delete()
      .eq('first_name', name.first)
      .eq('last_name', name.last)
      .select();

    if (error) {
      console.error(`❌ Error deleting ${name.first} ${name.last}:`, error.message);
    } else if (data && data.length > 0) {
      console.log(`✓ Deleted ${name.first} ${name.last}`);
    } else {
      console.log(`⚠️  ${name.first} ${name.last} not found`);
    }
  }

  console.log('\n✅ Sample data cleanup complete!\n');
}

main().catch(console.error);
