# Fix Storage Upload RLS Error

## Problem
Getting "violates row security" error when uploading profile photos.

## Solution

Copy and paste this SQL into your **Supabase Dashboard → SQL Editor** and click **Run**:

```sql
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
```

## Steps

1. Go to https://supabase.com/dashboard
2. Select your TexasLobby.org project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the SQL above and paste it
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned"

## Test

After running the SQL:
1. Refresh your `/dashboard/edit` page
2. Try uploading a profile photo again
3. It should work now!

## Verification

To verify the policies are in place, run this query:

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'objects' AND policyname LIKE '%profile photo%';
```

You should see 4 policies listed.
