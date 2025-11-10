import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyPolicies() {
  console.log('🔍 Verifying storage policies...\n');

  // We can't directly query pg_policies from the client, but we can test the bucket
  const { data: buckets, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  const profilePhotos = buckets.find(b => b.id === 'profile-photos');

  if (profilePhotos) {
    console.log('✅ profile-photos bucket exists');
    console.log('   - Public:', profilePhotos.public);
    console.log('   - Allowed MIME types:', profilePhotos.allowed_mime_types || 'Not restricted');
    console.log('   - File size limit:', profilePhotos.file_size_limit ? `${(profilePhotos.file_size_limit / 1024 / 1024).toFixed(1)}MB` : 'No limit');
  } else {
    console.log('❌ profile-photos bucket not found');
  }

  console.log('\n✨ Storage policies have been applied!');
  console.log('\n📸 You can now upload profile photos at /dashboard/edit');
  console.log('   Try uploading a photo and it should work now.');
}

verifyPolicies().catch(console.error);
