-- Add explicit deny policy for anonymous users on profiles table
-- This provides defense-in-depth protection for user email addresses

CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);