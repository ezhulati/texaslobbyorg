-- Fix approval_status for existing lobbyists that were approved before the field was consistently set
-- This catches profiles that were approved via the API before we added approval_status to the update

UPDATE public.lobbyists
SET approval_status = 'approved'
WHERE is_active = true
  AND is_pending = false
  AND (is_rejected IS FALSE OR is_rejected IS NULL)
  AND (approval_status IS NULL OR approval_status != 'approved');

-- Also fix any rejected profiles that don't have approval_status set
UPDATE public.lobbyists
SET approval_status = 'rejected'
WHERE is_rejected = true
  AND (approval_status IS NULL OR approval_status != 'rejected');

-- Fix any pending profiles that don't have approval_status set
UPDATE public.lobbyists
SET approval_status = 'pending'
WHERE is_pending = true
  AND (approval_status IS NULL OR approval_status != 'pending');
