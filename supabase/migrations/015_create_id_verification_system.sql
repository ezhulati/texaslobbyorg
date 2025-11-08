-- Migration 015: Create ID Verification System for Profile Claims
-- Creates storage bucket for ID documents and claim request tracking table

-- ============================================================================
-- PART 1: Create storage bucket for ID verification documents
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-verifications',
  'id-verifications',
  false,  -- NOT public - sensitive documents
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own ID verification documents
CREATE POLICY "Users can upload own ID verification"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-verifications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view their own ID documents
CREATE POLICY "Users can view own ID verification"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-verifications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all ID verification documents
CREATE POLICY "Admins can view all ID verifications"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-verifications' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Allow users to delete their own ID documents
CREATE POLICY "Users can delete own ID verification"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'id-verifications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- PART 2: Create profile claim requests table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_claim_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobbyist_id UUID NOT NULL REFERENCES public.lobbyists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_document_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  rejection_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),

  -- Prevent duplicate pending claims from same user for same profile
  CONSTRAINT unique_pending_claim UNIQUE (lobbyist_id, user_id, status)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_claim_requests_status ON public.profile_claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_claim_requests_lobbyist ON public.profile_claim_requests(lobbyist_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_user ON public.profile_claim_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_claim_requests_pending ON public.profile_claim_requests(submitted_at) WHERE status = 'pending';

-- ============================================================================
-- PART 3: Update lobbyists table with claim tracking fields
-- ============================================================================

ALTER TABLE public.lobbyists
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

-- Create index for claimed profiles
CREATE INDEX IF NOT EXISTS idx_lobbyists_claimed_by ON public.lobbyists(claimed_by) WHERE claimed_by IS NOT NULL;

-- ============================================================================
-- PART 4: Row Level Security for claim requests
-- ============================================================================

-- Enable RLS on profile_claim_requests
ALTER TABLE public.profile_claim_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own claim requests
CREATE POLICY "Users can view own claim requests"
ON public.profile_claim_requests
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create claim requests for themselves
CREATE POLICY "Users can create own claim requests"
ON public.profile_claim_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admins can view all claim requests
CREATE POLICY "Admins can view all claim requests"
ON public.profile_claim_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Admins can update claim requests (approve/reject)
CREATE POLICY "Admins can update claim requests"
ON public.profile_claim_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- PART 5: Helper functions
-- ============================================================================

-- Function to check if a profile has pending claims
CREATE OR REPLACE FUNCTION has_pending_claim(lobbyist_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profile_claim_requests
    WHERE lobbyist_id = lobbyist_uuid
    AND status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count pending claims for admin dashboard
CREATE OR REPLACE FUNCTION count_pending_claims()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.profile_claim_requests
    WHERE status = 'pending'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: Comments for documentation
-- ============================================================================

COMMENT ON TABLE public.profile_claim_requests IS 'Tracks profile claim requests with ID verification for admin approval';
COMMENT ON COLUMN public.profile_claim_requests.verification_document_url IS 'Supabase Storage URL for uploaded ID document (license, passport, etc)';
COMMENT ON COLUMN public.profile_claim_requests.status IS 'pending = awaiting admin review, approved = claim accepted, rejected = claim denied';
COMMENT ON COLUMN public.profile_claim_requests.rejection_reason IS 'Admin explanation for why claim was rejected';
COMMENT ON COLUMN public.lobbyists.claimed_by IS 'User ID who successfully claimed this profile';
COMMENT ON COLUMN public.lobbyists.claimed_at IS 'Timestamp when profile was claimed';
