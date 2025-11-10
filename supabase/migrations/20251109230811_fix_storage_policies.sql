-- Fix storage policies for profile photos bucket
-- Drop existing policies to avoid conflicts
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
