-- Add INSERT policy for users table
-- Allows authenticated users to create their own user record during signup/login

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Note: This works with the existing UPDATE policy to enable upsert operations
-- Users can now both INSERT (create) and UPDATE (modify) their own records
