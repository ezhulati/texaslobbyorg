-- Add subscription tracking fields to users table
-- These fields track Stripe subscription state for billing/access control

-- Create subscription status enum
CREATE TYPE subscription_status AS ENUM (
  'active',
  'trialing',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired'
);

-- Add subscription fields to users table
ALTER TABLE public.users
ADD COLUMN stripe_customer_id TEXT UNIQUE,
ADD COLUMN stripe_subscription_id TEXT UNIQUE,
ADD COLUMN subscription_tier subscription_tier NOT NULL DEFAULT 'free',
ADD COLUMN subscription_status subscription_status,
ADD COLUMN subscription_current_period_end TIMESTAMPTZ;

-- Add subscription status to lobbyists table for easier querying
ALTER TABLE public.lobbyists
ADD COLUMN subscription_status subscription_status;

-- Create index for faster subscription queries
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON public.users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON public.users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lobbyists_subscription_tier ON public.lobbyists(subscription_tier);

-- Update trigger to keep subscription_tier in sync between users and lobbyists
CREATE OR REPLACE FUNCTION sync_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- When user's subscription_tier changes, update their lobbyist profile
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    UPDATE public.lobbyists
    SET subscription_tier = NEW.subscription_tier,
        updated_at = NOW()
    WHERE user_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_user_subscription_tier
AFTER UPDATE OF subscription_tier ON public.users
FOR EACH ROW
EXECUTE FUNCTION sync_subscription_tier();

-- Comment the new columns
COMMENT ON COLUMN public.users.stripe_customer_id IS 'Stripe customer ID for billing';
COMMENT ON COLUMN public.users.stripe_subscription_id IS 'Current active Stripe subscription ID';
COMMENT ON COLUMN public.users.subscription_tier IS 'Current subscription tier (free, premium, featured)';
COMMENT ON COLUMN public.users.subscription_status IS 'Current Stripe subscription status';
COMMENT ON COLUMN public.users.subscription_current_period_end IS 'When current billing period ends';
