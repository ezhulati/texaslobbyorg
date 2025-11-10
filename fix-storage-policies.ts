import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStoragePolicies() {
  console.log('🔍 Checking profile-photos bucket...\n');

  // Check if bucket exists
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.error('❌ Error listing buckets:', bucketsError);
    return;
  }

  const profilePhotosBucket = buckets?.find(b => b.id === 'profile-photos');

  if (!profilePhotosBucket) {
    console.log('❌ profile-photos bucket does NOT exist');
    console.log('Creating bucket...\n');

    const { data: newBucket, error: createError } = await supabase
      .storage
      .createBucket('profile-photos', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });

    if (createError) {
      console.error('❌ Error creating bucket:', createError);
      return;
    }

    console.log('✅ Bucket created successfully');
  } else {
    console.log('✅ profile-photos bucket exists');
    console.log('   - Public:', profilePhotosBucket.public);
    console.log('   - ID:', profilePhotosBucket.id);
  }

  console.log('\n📋 Storage bucket setup complete!');
  console.log('\n⚠️  IMPORTANT: Storage RLS policies must be set via SQL');
  console.log('Run the following SQL in Supabase Dashboard → SQL Editor:\n');
  console.log(`
-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Lobbyists can upload own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Lobbyists can update own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Lobbyists can delete own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Lobbyists can upload own profile photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own profile photos
CREATE POLICY "Lobbyists can update own profile photo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own profile photos
CREATE POLICY "Lobbyists can delete own profile photo"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to all profile photos
CREATE POLICY "Public can view profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
  `);
}

fixStoragePolicies().catch(console.error);
