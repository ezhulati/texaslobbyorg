-- Add first_name and last_name columns to users table
-- This allows us to personalize communication by using first names

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Update existing records to split full_name into first_name and last_name
-- This handles any existing users who only have full_name
UPDATE public.users
SET
  first_name = CASE
    WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
    THEN split_part(full_name, ' ', 1)
    ELSE full_name
  END,
  last_name = CASE
    WHEN full_name IS NOT NULL AND position(' ' IN full_name) > 0
    THEN substring(full_name FROM position(' ' IN full_name) + 1)
    ELSE NULL
  END
WHERE first_name IS NULL;

-- Keep full_name for backward compatibility and display purposes
-- It will be auto-generated from first_name + last_name in the application
