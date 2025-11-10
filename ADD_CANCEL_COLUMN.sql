-- Add cancel_at_period_end column to users table
-- This allows tracking when a subscription is set to cancel at period end
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/tavwfbqflredtowjelbx/sql/new

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_cancel_at_period_end
ON public.users(cancel_at_period_end)
WHERE cancel_at_period_end = true;

COMMENT ON COLUMN public.users.cancel_at_period_end IS 'Whether the subscription is set to cancel at the end of the current billing period';

-- After running this SQL, run this script to sync your current cancel state:
-- npx tsx scripts/sync-cancel-state.ts
