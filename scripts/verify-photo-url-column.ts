import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyColumn() {
  console.log('🔍 Verifying photo_url column...\n');

  try {
    // Try to select the photo_url column
    const { data, error } = await supabase
      .from('lobbyists')
      .select('id, first_name, last_name, photo_url')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      console.error('   Details:', error);
      return;
    }

    console.log('✅ Success! photo_url column exists and is accessible');
    console.log('📊 Sample record:', data?.[0] || 'No records found');
    console.log('\n🎉 Photo upload should now work correctly!');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyColumn();
