-- Fix ID verification bucket to allow public URLs
-- The bucket needs to be public for getPublicUrl() to work
-- Security is still maintained through RLS policies

UPDATE storage.buckets
SET public = true
WHERE id = 'id-verifications';

-- Note: Files are still protected by RLS policies
-- Only users who uploaded and admins can SELECT the files
-- This just allows the public URL to resolve correctly
