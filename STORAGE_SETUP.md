# Supabase Storage Setup

## ID Verification Storage Bucket

✅ **CONFIGURED** - The `id-verifications` bucket has been automatically configured via database migrations.

### Current Configuration:

The bucket was created in migration `015_create_id_verification_system.sql` and updated in migration `20251111_fix_id_verification_bucket.sql`:

- **Name**: `id-verifications`
- **Public bucket**: ✅ Yes (allows public URLs to work)
- **File size limit**: 10 MB
- **Allowed MIME types**: JPG, PNG, PDF
- **RLS Policies**: Active (files still protected by row-level security)

### Security Model:

Even though the bucket is public, files are protected by RLS policies:

**Policy 1: Users can upload their own files** ✅ Applied
- Authenticated users can INSERT files in their own folder (`userId/filename`)

**Policy 2: Users can view their own files** ✅ Applied
- Authenticated users can SELECT files in their own folder

**Policy 3: Admins can view all files** ✅ Applied
- Users with `role = 'admin'` in the users table can SELECT any file

**Policy 4: Users can delete their own files** ✅ Applied
- Authenticated users can DELETE files in their own folder

### How It Works:

1. User selects ID document (JPG, PNG, or PDF) on `/create-profile`
2. File is uploaded to `id-verifications/{userId}/{timestamp}.{ext}`
3. Public URL is generated and stored with the profile
4. Admin reviews the document in the dashboard
5. Document is deleted after approval/rejection

### Testing:

To test the upload flow:
1. Go to `/create-profile`
2. Fill in the form fields
3. Drag/drop or select an ID document
4. Click "Upload Document" button
5. Wait for "Upload successful" confirmation
6. Submit the form

If errors occur, check browser console for specific error messages.
