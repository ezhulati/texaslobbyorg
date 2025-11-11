# Supabase Storage Setup

## ID Verification Storage Bucket

The create profile flow requires a Supabase Storage bucket for ID verification documents.

### Steps to Create the Bucket:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your TexasLobby project
3. Navigate to **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Configure the bucket:
   - **Name**: `id-verifications`
   - **Public bucket**: ✅ Check this (files need public URLs)
   - **File size limit**: 10 MB
   - **Allowed MIME types**: Leave empty (we validate in code)

6. Click **Create bucket**

### Bucket Policies (RLS):

After creating the bucket, set up these policies:

**Policy 1: Allow authenticated users to upload their own files**
```sql
-- Allow INSERT for authenticated users (their own folder)
create policy "Users can upload their own ID documents"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'id-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

**Policy 2: Allow admins to read all files**
```sql
-- Allow SELECT for service role (admin access)
create policy "Admins can view all ID documents"
on storage.objects for select
to service_role
using (bucket_id = 'id-verifications');
```

**Policy 3: Allow users to delete their own files**
```sql
-- Allow DELETE for authenticated users (their own folder)
create policy "Users can delete their own ID documents"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'id-verifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);
```

### Testing the Upload:

1. Go to `/create-profile` on your site
2. Fill in the form
3. Select an ID document (JPG, PNG, or PDF)
4. Click "Upload Document"
5. You should see the upload succeed and the form can be submitted

If you still see errors, check the browser console for specific error messages and verify:
- The bucket name is exactly `id-verifications`
- The bucket is marked as public
- Your `PUBLIC_SUPABASE_ANON_KEY` has the correct permissions
