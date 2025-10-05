-- Fix security issues on profiles table

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create new SELECT policy that explicitly requires authentication
CREATE POLICY "Authenticated users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Add explicit DELETE policy to prevent profile deletions
-- Profiles should be retained for data integrity
CREATE POLICY "Profiles cannot be deleted"
ON public.profiles
FOR DELETE
TO authenticated
USING (false);